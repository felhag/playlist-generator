import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Playlist {
  id: string;
  url: string;
  name: string;
  items: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {
  }

  getPlaylist(id: string): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.baseUrl}/playlist/${id}`);
  }
}
