from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth, StarletteOAuth2App

class OIDCAuth:
    def __init__(self, app: FastAPI, secret_key: str, client_id: str, client_secret: str, server_url: str):
        self.app = app
        self.app.add_middleware(SessionMiddleware, secret_key=secret_key)
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

        self.setup_routes()

    def setup_routes(self):
        @self.app.get('/login')
        async def login(request: Request):
            redirect_uri = request.url_for('oidc_callback')
            return await self.oauth.authelia.authorize_redirect(request, redirect_uri)

        @self.app.get('/oidc/callback', name='oidc_callback')
        async def oidc_callback(request: Request):
            provider: StarletteOAuth2App = self.oauth.authelia
            token = await provider.authorize_access_token(request)
            userinfo = await self.oauth.authelia.userinfo(token=token)
            request.session['user'] = dict(userinfo)
            return RedirectResponse(url='/')
       
        @self.app.get('/')
        async def homepage(request: Request):
            user = request.session.get('user')
            if user:
                return f"Hello, {user.get('name', 'User')}!"
            return 'You are not logged in.'
        
        @self.app.get('/logout')
        async def logout(request: Request):
            request.session.clear()
            return RedirectResponse(url='/')