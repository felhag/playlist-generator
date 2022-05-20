import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        HttpClientModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
