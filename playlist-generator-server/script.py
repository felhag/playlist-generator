import spotipy
import glob, os, json
from spotipy import CacheFileHandler
from spotipy.oauth2 import SpotifyOAuth
from conf import *

scope = "user-library-read"
data_folder = 'C:\\Users\\Felix\\Downloads\\my_spotify_data\\MyData'
exclusions = set()

os.chdir(data_folder)
for file in glob.glob("StreamingHistory*.json"):
    f = open(file, encoding="utf8")
    data = json.load(f)

    for track in data:
        exclusions.add((track['artistName'], track['trackName']))

    f.close()


def get_api(username):
    handler = CacheFileHandler(cache_path='cache.txt', username=username)
    auth_manager = SpotifyOAuth(client_id=clientId,
                                client_secret=clientSecret,
                                cache_handler=handler,
                                redirect_uri=redirectUrl,
                                open_browser=False,
                                scope="playlist-modify-private playlist-modify-public playlist-read-private user-library-read")
    return spotipy.Spotify(auth_manager=auth_manager)


sp = get_api('tonnytorpedo')
playlist_uri = "5KVOuT6YFuF4IOvdkUjNU8"
playlist = sp.playlist(playlist_uri)
items = playlist["tracks"]["items"]
seeds = list(map(lambda i: i["track"]["id"], items))

print(seeds)

uris = []

for i in range(5, 25 + 1, 5):
    recomms = sp.recommendations(seed_tracks=seeds[i - 5:i], limit=25)

    for track in recomms["tracks"]:
        contains = (track['artists'][0]['name'], track['name']) in exclusions
        if not contains:
            print('#', contains, track['artists'][0]['name'], ' - ', track['name'])
            uris.append(track['uri'])

print('Found', len(uris), 'tracks')
for i in range(0, len(uris), 100):
    chunk = uris[i:i + 100]
    sp.playlist_add_items(playlist_id='5vuKhUOZnI5PUv0E7VU68C', items=chunk)
