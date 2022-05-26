import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Login {
  id: string;
  display_name: string;
  external_urls: {spotify: string};
}

export interface Playlist {
  id: string;
  url: string;
  name: string;
  items: number;
}

export interface Recommendation {
  artist: string;
  track: string;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private readonly baseUrl = '/api';


  constructor(private http: HttpClient) {
  }

  login(): Observable<Login | undefined> {
    const code = new URLSearchParams(window.location.search).get('code');
    const params = code ? new HttpParams().set('code', code) : new HttpParams();
    return this.http.get<Login>(`${this.baseUrl}/auth`, {params}).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          window.location = error.headers.get('Location') as any;
        }
        return of({} as Login);
      })
    );
  }

  logout(): Observable<any> {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      window.history.pushState({}, document.title, window.location.pathname)
    }
    return this.http.get(`${this.baseUrl}/sign_out`);
  }

  getPlaylist(id: string): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.baseUrl}/playlist/${id}`);
  }

  generate(data: any): Observable<Recommendation[]> {
    return this.http.post<{ recommendations: Recommendation[] }>(`${this.baseUrl}/generate`, data).pipe(map(r => r.recommendations));
  }

  persist(playlist_id: string, uris: string[]): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.baseUrl}/persist`, {playlist_id, uris});
  }
}
