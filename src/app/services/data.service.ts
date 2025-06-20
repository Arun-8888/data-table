// data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface ParticipantsResponse {
  participants: Array<{
    id?: number;
    name: string;
    language: string;
    country: string;
    countryCode: string;
    city: string;
    street: string;
    timeline?: string;
    totalvalue ?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private http: HttpClient) { }

  getParticipants(): Observable<ParticipantsResponse> {
    const url = '/assets/db_custom.json';
    console.log('Attempting to fetch participants from:', url);

    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('Response type:', typeof response);
        console.log('Raw response:', response);
        
        try {
          // If response is a string, try to parse it
          if (typeof response === 'string') {
            response = JSON.parse(response);
            console.log('Parsed string response:', response);
          }
          
          if (!response) {
            throw new Error('Empty response received');
          }
          
          // Handle case where response might be an array directly
          if (Array.isArray(response)) {
            console.log('Response is an array, wrapping in participants object');
            return { participants: response };
          }
          
          // Handle case where data might be directly in response
          if (!response.participants && Array.isArray(response.data)) {
            console.log('Found data array instead of participants, remapping');
            return { participants: response.data };
          }
          
          if (!response.participants || !Array.isArray(response.participants)) {
            console.error('Invalid response structure:', response);
            throw new Error('Invalid response format: participants is not an array');
          }
          
          console.log(`Successfully found ${response.participants.length} participants`);
          return response;
        } catch (error) {
          console.error('Error processing response:', error);
          throw error;
        }
      }),
      catchError(error => {
        console.error('HTTP error in data service:', error);
        if (error.status === 404) {
          console.error('File not found. Please check if', url, 'exists in the assets folder');
        }
        throw error;
      })
    );
  }
}