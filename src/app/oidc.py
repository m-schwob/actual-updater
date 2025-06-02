from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, StarletteOAuth2App
from authlib.integrations.base_client.errors import InvalidTokenError
import httpx


class OIDCAuth:
    def __init__(self, app: FastAPI, client_id: str, client_secret: str, server_url: str):
        self.app = app
        self.server_url = server_url

        self.oauth = OAuth()
        self.oauth.register(
            name='authelia',
            client_id=client_id,
            client_secret=client_secret,
            server_metadata_url=self.server_url.rstrip('/') + '/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid profile groups'
            }
        )

        self._setup_routes()
        self._register_oidc_middleware()

    def _setup_routes(self):
        @self.app.get('/login')
        async def login(request: Request):
            redirect_uri = request.url_for('oidc_callback')
            provider: StarletteOAuth2App = self.oauth.authelia
            return await provider.authorize_redirect(request, redirect_uri)

        @self.app.get('/oidc/callback', name='oidc_callback')
        async def oidc_callback(request: Request):
            provider: StarletteOAuth2App = self.oauth.authelia
            token = await provider.authorize_access_token(request)
            request.session['token'] = token
            userinfo = await provider.userinfo(token=token)
            request.session['user'] = dict(userinfo)
            request.session['authelia_session'] = request.cookies['authelia_session']
            return RedirectResponse(url='/')
           
        @self.app.get('/logout')
        async def logout(request: Request):
            request.session.clear()
            return RedirectResponse(url='/')
                     
    def _register_oidc_middleware(self):
        @self.app.middleware('http')
        async def oidc_middleware(request: Request, call_next):
            if request.url.path in ['/login', '/oidc/callback', '/logout']:
                return await call_next(request)
            if await self._verify_authelia_session(request):
                provider: StarletteOAuth2App = self.oauth.authelia
                token = request.session.get('token')
                try:
                    userinfo = await provider.userinfo(token=token) # validate the user token
                except InvalidTokenError:
                    pass
                if userinfo:
                    return await call_next(request)
            request.session.clear()
            return RedirectResponse(url='/login') 
     
    async def _verify_authelia_session(self, request: Request):
        authelia_session = request.cookies.get('authelia_session')
        if not authelia_session or authelia_session != request.session.get('authelia_session'):
            return False
        
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(
        #         f"{self.server_url.rstrip('/')}/api/verify", headers={
        #             'Cookie': f'authelia_session={authelia_session}'
        #         }
        #     )
        #     if response.status_code != 200:
        #         return False
        return True
            
                