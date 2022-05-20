import http
import os

from flask import Flask, request
from flask_session import Session

import lastfm
import spotify

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(64)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './.flask_session/'
Session(app)

#
# @app.route('/api/auth')
# def index():
#     if not session.get('uuid'):
#         # Step 1. Visitor is unknown, give random ID
#         session['uuid'] = str(uuid.uuid4())
#
#     cache_handler = spotipy.cache_handler.CacheFileHandler(cache_path=session_cache_path())
#
#     auth_manager = spotipy.oauth2.SpotifyOAuth(client_id=clientId,
#                                                client_secret=clientSecret,
#                                                redirect_uri=redirectUrl,
#                                                cache_handler=cache_handler,
#                                                scope='playlist-modify-private playlist-modify-public user-read-currently-playing',
#                                                show_dialog=True)
#
#     if request.args.get("code"):
#         # Step 3. Being redirected from Spotify auth page
#         auth_manager.get_access_token(request.args.get("code"))
#         return flask.Response(), 200
#
#     if not auth_manager.validate_token(cache_handler.get_cached_token()):
#         # Step 2. Display sign in link when no token
#         resp = flask.Response('Unauthorized')
#         resp.headers['Location'] = auth_manager.get_authorize_url()
#         return resp, 401
#
#     # Step 4. Signed in, display data
#     spotify = spotipy.Spotify(auth_manager=auth_manager)
#     return f'<h2>Hi {spotify.me()["display_name"]}, ' \
#            f'<small><a href="/sign_out">[sign out]<a/></small></h2>' \
#            f'<a href="/playlists">my playlists</a> | ' \
#            f'<a href="/currently_playing">currently playing</a> | ' \
#            f'<a href="/current_user">me</a>'

#
# @app.route('/sign_out')
# def sign_out():
#     try:
#         # Remove the CACHE file (.cache-test) so that a new user can authorize.
#         os.remove(session_cache_path())
#         session.clear()
#     except OSError as e:
#         print("Error: %s - %s." % (e.filename, e.strerror))
#     return redirect('/')


@app.route('/api/playlist/<playlist_id>')
def playlists(playlist_id):
    spotify.get_playlists(playlist_id)


@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    seeds = data.get('seeds')
    username = data.get('username')

    exclusions = list(map(lambda t: (t['artist'].lower(), t['track'].lower()), lastfm.get_exclusions(username)))
    return spotify.generate(exclusions, seeds, 100)


@app.route('/api/persist', methods=['POST'])
def persist():
    data = request.get_json()
    uris = data.get('uris')
    pid = str(data.get('playlist_id'))
    playlist_id = pid if not pid.startswith('https://') else pid.split('/')[-1].split('?')[0]

    spotify.save(uris, playlist_id)

    return '', http.HTTPStatus.NO_CONTENT


'''
Following lines allow application to be run more conveniently with
`python api.py` (Make sure you're using python3)
(Also includes directive to leverage pythons threading capacity.)
'''
if __name__ == '__main__':
    app.run(threaded=True, port=13337)
