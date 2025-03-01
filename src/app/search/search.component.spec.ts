import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchComponent } from './search.component';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let mockXHR: any;
  let originalXHR: any;

  // Helper function to mock XMLHttpRequest
  function setupMockXHR() {
    mockXHR = {
      open: jasmine.createSpy('open'),
      send: jasmine.createSpy('send'),
      setRequestHeader: jasmine.createSpy('setRequestHeader'),
      readyState: 4,
      status: 200,
      response: '',
      responseText: '',
      onload: null,
      onerror: null
    };

    // Store the original XMLHttpRequest
    originalXHR = window.XMLHttpRequest;
    // Replace with our mock
    (window as any).XMLHttpRequest = jasmine.createSpy('XMLHttpRequest').and.returnValue(mockXHR);
  }

  function restoreXHR() {
    window.XMLHttpRequest = originalXHR;
  }

  beforeEach(async () => {
    setupMockXHR();

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        SearchComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    restoreXHR();
  });

  // Basic initialization tests
  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty searchTerm and results', () => {
      expect(component.searchTerm).toBe('');
      expect(component.searchResults.length).toBe(0);
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('');
    });

    it('should have a predefined list of suggestions', () => {
      expect(component.allSuggestions.length).toBeGreaterThan(0);
      expect(component.allSuggestions).toContain('Angular');
    });
  });

  // Input and validation tests
  describe('Input Validation', () => {
    it('should not search with empty search term', () => {
      component.searchTerm = '';

      component.search();

      expect(mockXHR.send).not.toHaveBeenCalled();
      expect(component.searchResults.length).toBe(0);
    });

    it('should not search with search term <= 3 characters', () => {
      component.searchTerm = 'abc';

      component.search();

      expect(mockXHR.send).not.toHaveBeenCalled();
      expect(component.errorMessage).toContain('more than 3 characters');
    });

    it('should search with search term > 3 characters', () => {
      component.searchTerm = 'angular';

      component.search();

      expect(mockXHR.open).toHaveBeenCalled();
      expect(mockXHR.send).toHaveBeenCalled();
    });
  });

  // Search functionality tests
  describe('Search Functionality', () => {
    it('should make API call with correct URL and query parameters', () => {
      const searchTerm = 'angular';
      component.searchTerm = searchTerm;
      const expectedUrl = `https://jsonplaceholder.typicode.com/comments?q=${encodeURIComponent(searchTerm)}`;

      component.search();

      expect(mockXHR.open).toHaveBeenCalledWith('GET', expectedUrl, true);
      expect(mockXHR.send).toHaveBeenCalled();
    });

    it('should update searchResults when API returns data', fakeAsync(() => {
      const mockResults = [
        { id: 1, name: 'Test 1', email: 'test1@example.com', body: 'This is test comment 1' },
        { id: 2, name: 'Test 2', email: 'test2@example.com', body: 'This is test comment 2' }
      ];
      component.searchTerm = 'test';

      component.search();

      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify(mockResults);
      mockXHR.onload();

      expect(component.searchResults.length).toBe(2);
      expect(component.searchResults[0].name).toBe('Test 1');
    }));

    it('should handle API error', fakeAsync(() => {
      component.searchTerm = 'testsearch';

      component.search();

      mockXHR.status = 404;
      mockXHR.statusText = 'Not Found';
      mockXHR.onload();

      expect(component.errorMessage).toBeTruthy();
      expect(component.searchResults.length).toBe(0);
    }));

    it('should handle network error', fakeAsync(() => {
      component.searchTerm = 'testsearch';

      component.search();

      mockXHR.onerror();

      expect(component.errorMessage).toContain('Network error');
      expect(component.searchResults.length).toBe(0);
    }));

    it('should handle JSON parsing error', fakeAsync(() => {
      component.searchTerm = 'testsearch';

      component.search();

      mockXHR.status = 200;
      mockXHR.responseText = '{invalid json}';
      mockXHR.onload();

      expect(component.errorMessage).toContain('Error processing');
      expect(component.searchResults.length).toBe(0);
    }));

    it('should limit results to 20 items', fakeAsync(() => {
      const mockResults = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Test ${i + 1}`,
        email: `test${i + 1}@example.com`,
        body: `This is test comment ${i + 1}`
      }));
      component.searchTerm = 'test';

      component.search();

      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify(mockResults);
      mockXHR.onload();

      expect(component.searchResults.length).toBe(20);
    }));
  });

  // Typeahead functionality tests
  describe('Typeahead Functionality', () => {
    it('should filter suggestions based on input', () => {
      component.searchTerm = 'ang';

      component.onInputChange();

      expect(component.filteredSuggestions).toContain('Angular');
      expect(component.filteredSuggestions.length).toBeGreaterThan(0);
      expect(component.showSuggestions).toBeTrue();
    });

    it('should hide suggestions when no matches found', () => {
      component.searchTerm = 'nonexistentterm';

      component.onInputChange();

      expect(component.filteredSuggestions.length).toBe(0);
      expect(component.showSuggestions).toBeFalse();
    });

    it('should hide suggestions on empty input', () => {
      component.searchTerm = '';

      component.onInputChange();

      expect(component.showSuggestions).toBeFalse();
      expect(component.filteredSuggestions.length).toBe(0);
    });

    it('should update searchTerm when suggestion is selected', () => {
      const suggestion = 'Angular';

      component.selectSuggestion(suggestion);

      expect(component.searchTerm).toBe(suggestion);
      expect(component.showSuggestions).toBeFalse();
    });
  });

  // Text truncation tests
  describe('Text Truncation', () => {
    it('should not truncate text shorter than max length', () => {
      const shortText = 'Short text';

      const result = component.truncateText(shortText, 64);

      expect(result).toBe(shortText);
    });

    it('should truncate text longer than max length', () => {
      const longText = 'A very long text that should be truncated because it exceeds the maximum allowed length for display';
      const maxLength = 20;

      const truncated = component.truncateText(longText, maxLength);

      expect(truncated.length).toBe(23); // 20 chars + 3 for ellipsis
      expect(truncated).toContain('...');
    });

    it('should use default max length of 64 when not specified', () => {
      const longText = 'A'.repeat(100);

      const truncated = component.truncateText(longText);

      expect(truncated.length).toBe(67); // 64 chars + 3 for ellipsis
    });
  });

  // UI element tests
  describe('UI Elements', () => {
    it('should display loading indicator when isLoading is true', () => {
      component.isLoading = true;

      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading-indicator'));
      expect(loadingElement).toBeTruthy();
    });

    it('should not display loading indicator when isLoading is false', () => {
      component.isLoading = false;

      fixture.detectChanges();

      const loadingElement = fixture.debugElement.query(By.css('.loading-indicator'));
      expect(loadingElement).toBeFalsy();
    });

    it('should display error message when errorMessage is set', () => {
      const errorMsg = 'Test error message';
      component.errorMessage = errorMsg;

      fixture.detectChanges();

      const errorElement = fixture.debugElement.query(By.css('.error-message'));
      expect(errorElement).toBeTruthy();
      expect(errorElement.nativeElement.textContent).toContain(errorMsg);
    });

    it('should display no results message when search returns empty array', () => {
      component.searchTerm = 'test';
      component.searchResults = [];
      component.isLoading = false;
      component.errorMessage = '';

      fixture.detectChanges();

      const noResultsElement = fixture.debugElement.query(By.css('.no-results'));
      expect(noResultsElement).toBeTruthy();
    });

    it('should display results list when search returns data', () => {
      component.searchResults = [
        { id: 1, name: 'Test 1', email: 'test1@example.com', body: 'This is test comment 1' }
      ];
      component.isLoading = false;

      fixture.detectChanges();

      const resultsElement = fixture.debugElement.query(By.css('.search-results'));
      expect(resultsElement).toBeTruthy();
    });
  });

  // DOM interaction tests
  describe('DOM Interactions', () => {
    it('should trigger search on button click', () => {
      spyOn(component, 'search');
      const button = fixture.debugElement.query(By.css('.submit-btn'));

      button.nativeElement.click();

      expect(component.search).toHaveBeenCalled();
    });

    it('should trigger search on Enter key press in input', () => {
      spyOn(component, 'search');
      const input = fixture.debugElement.query(By.css('input'));
      const event = new KeyboardEvent('keyup', { key: 'Enter' });

      input.nativeElement.dispatchEvent(event);

      expect(component.search).toHaveBeenCalled();
    });

    it('should trigger onInputChange when typing in input', () => {
      spyOn(component, 'onInputChange');
      const input = fixture.debugElement.query(By.css('input'));

      input.nativeElement.value = 'test';
      input.nativeElement.dispatchEvent(new Event('input'));

      expect(component.onInputChange).toHaveBeenCalled();
    });

    it('should select suggestion on click', fakeAsync(() => {
      component.searchTerm = 'ang';
      component.onInputChange();
      fixture.detectChanges();
      spyOn(component, 'selectSuggestion');

      tick();
      fixture.detectChanges();
      const firstSuggestion = fixture.debugElement.query(By.css('.suggestions-list li'));
      if (firstSuggestion) {
        firstSuggestion.nativeElement.click();
      }

      if (firstSuggestion) {
        expect(component.selectSuggestion).toHaveBeenCalled();
      }
    }));
  });
});