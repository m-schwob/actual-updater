from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth,StarletteOAuth2App


app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="your-secret-key")


oauth = OAuth()
oauth.register(
    name='authelia',
    client_id='updater-client-id',
    client_secret='updater-client-secret',
    server_metadata_url='http://127.0.0.1:9091/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid profile groups'
    }
)

@app.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for('oidc_callback')
    return await oauth.authelia.authorize_redirect(request, redirect_uri)

@app.get('/oidc/callback', name='oidc_callback')
async def oidc_callback(request: Request):
    provider : StarletteOAuth2App = oauth.authelia
    token  = await provider.authorize_access_token(request)
    userinfo = await oauth.authelia.userinfo(token=token)
    request.session['user'] = dict(userinfo)
    return RedirectResponse(url='/')

@app.get('/')
async def homepage(request: Request):
    user = request.session.get('user')
    if user:
        return f"Hello, {user['name']}!"
    return 'You are not logged in.'

@app.get('/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url='/')