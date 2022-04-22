import os

import flask
import spotipy
import uuid
from flask import Flask, session, request, redirect
from flask_session import Session
from conf import *

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(64)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './.flask_session/'
Session(app)

caches_folder = './.cache/'
if not os.path.exists(caches_folder):
    os.makedirs(caches_folder)


def session_cache_path():
    return caches_folder + session.get('uuid')


def get_api():
    cache_handler = spotipy.cache_handler.CacheFileHandler(cache_path=session_cache_path())

    return spotipy.oauth2.SpotifyOAuth(client_id=clientId,
                                       client_secret=clientSecret,
                                       redirect_uri=redirectUrl,
                                       cache_handler=cache_handler)


@app.route('/api/auth')
def index():
    if not session.get('uuid'):
        # Step 1. Visitor is unknown, give random ID
        session['uuid'] = str(uuid.uuid4())

    cache_handler = spotipy.cache_handler.CacheFileHandler(cache_path=session_cache_path())

    auth_manager = spotipy.oauth2.SpotifyOAuth(client_id=clientId,
                                               client_secret=clientSecret,
                                               redirect_uri=redirectUrl,
                                               cache_handler=cache_handler,
                                               scope='user-read-currently-playing playlist-modify-private',
                                               show_dialog=True)

    if request.args.get("code"):
        # Step 3. Being redirected from Spotify auth page
        auth_manager.get_access_token(request.args.get("code"))
        return flask.Response(), 200

    if not auth_manager.validate_token(cache_handler.get_cached_token()):
        # Step 2. Display sign in link when no token
        resp = flask.Response('Unauthorized')
        resp.headers['Location'] = auth_manager.get_authorize_url()
        return resp, 401

    # Step 4. Signed in, display data
    spotify = spotipy.Spotify(auth_manager=auth_manager)
    return f'<h2>Hi {spotify.me()["display_name"]}, ' \
           f'<small><a href="/sign_out">[sign out]<a/></small></h2>' \
           f'<a href="/playlists">my playlists</a> | ' \
           f'<a href="/currently_playing">currently playing</a> | ' \
           f'<a href="/current_user">me</a>'


@app.route('/sign_out')
def sign_out():
    try:
        # Remove the CACHE file (.cache-test) so that a new user can authorize.
        os.remove(session_cache_path())
        session.clear()
    except OSError as e:
        print("Error: %s - %s." % (e.filename, e.strerror))
    return redirect('/')


@app.route('/api/playlist/<playlist_id>')
def playlists(playlist_id):
    auth_manager = get_api()
    sp = spotipy.Spotify(auth_manager=auth_manager)
    playlist = sp.playlist(playlist_id)
    items = playlist["tracks"]["items"]
    return {
        "name": playlist['name'],
        "items": list(map(lambda item: {
            "id": item["track"]["id"],
            "artist": item['track']['artists'][0]['name'],
            "track": item["track"]["name"],
        }, items))
    }


@app.route('/api/generate', methods=['POST'])
def generate():
    auth_manager = get_api()
    sp = spotipy.Spotify(auth_manager=auth_manager)

    uris = []

    for playlist_id in request.get_json():
        playlist = sp.playlist(playlist_id)
        items = playlist["tracks"]["items"]
        seeds = list(map(lambda item: item["track"]["id"], items))

        print(seeds)

        for i in range(5, 25 + 1, 5):
            recomms = sp.recommendations(seed_tracks=seeds[i - 5:i], limit=25)

            for track in recomms["tracks"]:
                # contains = (track['artists'][0]['name'], track['name']) in exclusions
                # if not contains:
                print('#', i, track['artists'][0]['name'], ' - ', track['name'])
                uris.append({
                    "artist": track['artists'][0]['name'],
                    "track": track['name'],
                    "id": track['uri']
                })

    return {"recommendations": uris}


'''
Following lines allow application to be run more conveniently with
`python api.py` (Make sure you're using python3)
(Also includes directive to leverage pythons threading capacity.)
'''
if __name__ == '__main__':
    app.run(threaded=True, port=13337)
