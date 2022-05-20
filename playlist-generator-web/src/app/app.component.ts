import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';

interface Recommendation {
    artist: string;
    track: string;
    id: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
    displayedColumns: string[] = ['select', 'artist', 'track', 'id'];
    selection = new SelectionModel<Recommendation>(true, []);
    dataSource = new MatTableDataSource<Recommendation>();

    baseUrl = '/api';
    target = '';

    group = new FormGroup({
        username: new FormControl(),
        seed: new FormControl('')
    });

    constructor(private http: HttpClient) {
    }

    ngOnInit(): void {
        const code = new URLSearchParams(window.location.search).get('code');
        const params = code ? new HttpParams().set('code', code) : new HttpParams();
        this.http.get(`${this.baseUrl}/auth`, {params}).subscribe({
            next: () => {},
            error: e => {
                if (e.status === 401) {
                    window.location = e.headers.get('Location');
                }
            }
        });
    }

    generate() {
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/generate`, this.group.getRawValue()).subscribe(result => {
            const data = this.dataSource.data;
            data.push(...result.recommendations);
            this.dataSource.data = data;
            this.selection.select(...result.recommendations);
        });
    }

    persist() {
        this.http.post<{recommendations: Recommendation[]}>(`${this.baseUrl}/persist`, {
            playlist_id: this.target,
            uris: this.selection.selected.map(g => g.id)
        }).subscribe(result => {

        });
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    masterToggle() {
        if (this.selection.selected.length === this.dataSource.data.length) {
            this.selection.clear();
            return;
        }

        this.selection.select(...this.dataSource.data);
    }

    artistUrl(elem: Recommendation): string {
        return `https://www.last.fm/user/${this.group.controls.username.value}/library/music/${encodeURIComponent(elem.artist)}`
    }
}
