import { SelectionModel } from '@angular/cdk/collections';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Playlist } from './resource.service';

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

  group = new FormGroup({
    src: new FormGroup({
      username: new FormControl('', Validators.required),
      seed: new FormControl('', Validators.required),
    }),
    target: new FormControl('', Validators.required)
  });

  constructor(private http: HttpClient, private snackbar: MatSnackBar) {
  }

  ngOnInit(): void {
    const code = new URLSearchParams(window.location.search).get('code');
    const params = code ? new HttpParams().set('code', code) : new HttpParams();
    this.http.get(`${this.baseUrl}/auth`, {params}).subscribe({
      next: () => {
      },
      error: e => {
        if (e.status === 401) {
          window.location = e.headers.get('Location');
        }
      }
    });
  }

  generate() {
    const src = this.srcGroup;
    if (!src.valid) {
      src.markAllAsTouched();
      return;
    }
    this.http.post<{ recommendations: Recommendation[] }>(`${this.baseUrl}/generate`, src.getRawValue()).subscribe(result => {
      const data = this.dataSource.data;
      data.push(...result.recommendations);
      this.dataSource.data = data.filter((r, idx, self) => self.findIndex(i => i.id === r.id) === idx);
      this.selection.select(...result.recommendations);
    });
  }

  persist() {
    const target = this.group.controls.target as FormControl;
    if (!target.valid || !this.selection.hasValue()) {
      target.markAsTouched();
      return;
    }

    this.http.post<Playlist>(`${this.baseUrl}/persist`, {
      playlist_id: target.value,
      uris: this.selection.selected.map(g => g.id)
    }).subscribe(playlist => {
      this.snackbar.open(`Added ${this.selection.selected.length} tracks to ${playlist.name}`, 'Open', { duration: 5000 })
        .onAction()
        .subscribe(() => window.open(playlist.url));
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
    return `https://www.last.fm/user/${this.srcGroup.controls.username.value}/library/music/${encodeURIComponent(elem.artist)}`
  }

  private get srcGroup(): FormGroup {
    return this.group.controls.src as FormGroup;
  }
}
