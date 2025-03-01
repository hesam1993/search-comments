import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  searchTerm = '';
  searchResults: any[] = [];
  isLoading = false;
  errorMessage = '';
  
  // For typeahead functionality
  showSuggestions = false;
  allSuggestions = [
    'Angular', 'React', 'Vue', 'JavaScript', 'TypeScript',
    'HTML', 'CSS', 'SCSS', 'Node.js', 'Express',
    'MongoDB', 'MySQL', 'PostgreSQL', 'Python', 'Lorem', 'Java',
    'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin'
  ];
  filteredSuggestions: string[] = [];

  constructor() {}

  // Filter suggestions as user types
  onInputChange(): void {
    this.errorMessage = '';
    
    if (this.searchTerm.trim() === '') {
      this.filteredSuggestions = [];
      this.showSuggestions = false;
      return;
    }

    this.filteredSuggestions = this.allSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    
    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  // Select a suggestion
  selectSuggestion(suggestion: string): void {
    this.searchTerm = suggestion;
    this.showSuggestions = false;
    this.errorMessage = '';
    this.search();
  }

  // Truncate text to specified length and add ellipsis if needed
  truncateText(text: string, maxLength: number = 64): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  // Perform search when submit button is clicked
  search(): void {
    this.showSuggestions = false;
    this.errorMessage = '';
    
    const trimmedSearchTerm = this.searchTerm.trim();
    
    if (trimmedSearchTerm === '') {
      this.searchResults = [];
      return;
    }
    
    // Check if search term is longer than 3 characters
    if (trimmedSearchTerm.length <= 3) {
      this.errorMessage = 'Please enter more than 3 characters to search';
      this.searchResults = [];
      return;
    }
    
    this.isLoading = true;
    
    const apiUrl = `https://jsonplaceholder.typicode.com/comments?q=${encodeURIComponent(trimmedSearchTerm)}`;
    
    // Using XHR instead of HttpClient
    const xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          // Limit to max 20 results
          this.searchResults = data.slice(0, 20);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          this.errorMessage = 'Error processing search results.';
          this.searchResults = [];
        }
      } else {
        console.error('Error fetching search results:', xhr.statusText);
        this.errorMessage = 'Error fetching search results. Please try again.';
        this.searchResults = [];
      }
      this.isLoading = false;
    };
    
    xhr.onerror = () => {
      console.error('Network error occurred');
      this.isLoading = false;
      this.searchResults = [];
      this.errorMessage = 'Network error fetching search results. Please try again.';
    };
    
    xhr.send();
  }
}
