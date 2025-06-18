import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService } from './services/data.service';
import { NgxEchartsModule } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

interface Participant {
  id?: number;
  name: string;
  language: string;
  country: string;
  countryCode: string;
  city: string;
  street: string;
  timeline?: string;
  totalvalue?: string;
  chartOptions?: EChartsOption | null; // ✅ mark optional
}

interface ColumnDef {
  field: keyof Participant;
  header: string;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  group: string;
  type: string;
  groupable: boolean;
}

interface ColumnGroup {
  name: string;
  columns: string[];
}

interface GroupItem {
  isGroup: true;
  groupField: keyof Participant;
  groupValue: string;
  count: number;
}

interface CountryFlag {
  code: string;
  name: string;
  flag: string;
}

type DataItem = Participant | GroupItem;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,NgxEchartsModule],
  providers: [DataService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  // Data properties
 generateChartOptions(item: any): any {
  return {
    backgroundColor: '#1e2a38',
    title: { show: false },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      axisLabel: { color: '#ccc', fontSize: 9 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#ccc', fontSize: 9 }
    },
    series: [{
      type: 'bar',
      data: [5, 10, 15, 8, 12], // Optionally use item-based values
      itemStyle: {
        color: '#4ea6ff',
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };
}
  data: Participant[] = [];
  filteredData: Participant[] = [];
  displayedData: DataItem[] = [];
  hiddenRows: Set<number> = new Set();
  loading: boolean = false;
  
  error: string | null = null;
  
  // UI state
  selectedDataSize: string = 'row 10 col 22';
  selectedTheme: string = 'Quartz';
  filterText: string = '';
  isDragging: boolean = true;
  isRightPanelOpen: boolean = false;
  isColumnVisibilityOpen: boolean = false;
  isDarkMode: boolean = true;
  activeDropdown: string | null = null;
  activeColumnMenu: string | null = null;
  activeFilterDropdown: string | null = null;
  selectedRows: Set<number> = new Set();
  
  // Column configuration
  columnOrder: Array<keyof Participant> = [];
  columnVisibility: { [key in keyof Participant]?: boolean } = {};
  columnFilters: { [key: string]: string } = {};
  filterOptions: { [key: string]: Set<string> } = {};
  selectedFilterOptions: { [key: string]: Set<string> } = {};
  
  // Pagination
 currentPage = 1;
pageSizeOptions = [100];
pageSize: number = this.pageSizeOptions[0]; // Default to 10 rows per page
  // Sorting
  sortField: keyof Participant | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Row grouping
  rowGroups: (keyof Participant)[] = [];
  expandedGroups: Set<string> = new Set();

  columns: ColumnDef[] = [];
  columnGroups: ColumnGroup[] = [];
  
  constructor(private dataService: DataService) {
    this.initializeColumns();
  }

  private initializeColumns(): void {
    this.columns = [
      { field: 'name', header: 'Name', sortable: true, filterable: true, visible: true, group: 'Personal Info', type: 'string', groupable: true },
      { field: 'language', header: 'Language', sortable: true, filterable: true, visible: true, group: 'Personal Info', type: 'string', groupable: true },
      { field: 'country', header: 'Country', sortable: true, filterable: true, visible: true, group: 'Location', type: 'string', groupable: true },
      { field: 'city', header: 'City', sortable: true, filterable: true, visible: true, group: 'Location', type: 'string', groupable: true },
      { field: 'street', header: 'Street', sortable: true, filterable: true, visible: true, group: 'Location', type: 'string', groupable: true },
      { field: 'countryCode', header: 'Country Code', sortable: true, filterable: true, visible: true, group: 'Location', type: 'string', groupable: true },
      { field: 'timeline', header: 'Time line', sortable: true, filterable: true, visible: false, group: 'Financial', type: 'string', groupable: true },
      { field: 'totalvalue', header: 'Total value', sortable: true, filterable: true, visible: false, group: 'Financial', type: 'string', groupable: true }
    ];

    this.columnGroups = [
      { name: 'Personal Info', columns: ['name', 'language'] },
      { name: 'Location', columns: ['country', 'city', 'street', 'countryCode'] },
      { name: 'Financial', columns: ['timeline', 'totalvalue'] }
    ];

    // Initialize column visibility
    this.columnVisibility = {
      name: true,
      language: true,
      country: true,
      city: true,
      street: true,
      countryCode: true,
      timeline: true,
      totalvalue: true
    };

    // Initialize column order
    this.columnOrder = this.columns.map(col => col.field);
  }

  ngOnInit() {
    this.loadData();
  }
  private loadData(): void {
    this.loading = true;
    this.error = null;
    console.log('Starting data load...');
    
    this.dataService.getParticipants().subscribe({
      next: (response) => {
        console.log('Raw response:', response);
        if (response && response.participants) {
          this.data = response.participants;
          console.log('Data loaded:', this.data.length, 'participants');
          
          const rowCount = parseInt(this.selectedDataSize.split(' ')[1],);
          console.log('Initializing with', rowCount, 'rows');
          
          this.filteredData = this.data.slice(0, rowCount);
          
          // Initialize the display
          this.initializeAllFilterOptions();
          this.applyFiltersAndSort();
          this.updateDisplayData();
          
          console.log('Display data prepared:', this.displayedData.length, 'items');
        } else {
          this.error = 'Invalid response format';
          console.error('Invalid response format:', response);
        }
      },
      error: (error: Error) => {
        this.error = 'Error loading data: ' + error.message;
        console.error('Error loading participants:', error);
      },
      complete: () => {
        this.loading = false;
        console.log('Data loading completed');
      }
    });
  }

  // Type guards and helpers
  isGroupItem(item: DataItem): item is GroupItem {
    return 'isGroup' in item && item.isGroup === true;
  }

  isParticipantItem(item: DataItem | GroupItem): item is Participant {
  return 'name' in item && 'language' in item;
}
isDataItem(item: DataItem | GroupItem): item is DataItem {
  return 'id' in item && 'chartOptions' in item;
}
  getRowId(item: DataItem): number {
    if (!this.isParticipantItem(item)) return -1;
    return item.id ?? this.data.indexOf(item);
  }

  isRowSelected(item: DataItem): boolean {
    if (!this.isParticipantItem(item)) return false;
    return this.hiddenRows.has(this.getRowId(item));
  }

  toggleRowSelection(id: number): void {
    if (id === -1) return;
    
    if (this.hiddenRows.has(id)) {
      this.hiddenRows.delete(id);
      this.selectedRows.delete(id);
    } else {
      this.hiddenRows.add(id);
      this.selectedRows.add(id);
    }
    this.updateDisplayData();
  }

  initializeFilterOptions(field: keyof Participant): void {
    if (!this.filterOptions[field]) {
      this.filterOptions[field] = new Set<string>();
      this.data.forEach(item => {
        const value = String(item[field]).trim();
        if (value) {
          this.filterOptions[field].add(value);
        }
      });
    }
  }

  initializeAllFilterOptions(): void {
    this.columns.forEach(col => {
      if (col.filterable) {
        this.initializeFilterOptions(col.field);
      }
    });
  }

  // Data management
 applyFiltersAndSort() {
    let result = this.data.slice(0, parseInt(this.selectedDataSize.split(' ')[1], 10));

    // Apply column filters
    Object.entries(this.columnFilters).forEach(([field, value]) => {
      result = result.filter(item => 
        String(item[field as keyof Participant])
          .toLowerCase()
          .includes(value.toLowerCase())
      );
    });

    // Apply column filters
    Object.entries(this.columnFilters).forEach(([field, value]) => {
      result = result.filter(item => 
        String(item[field as keyof Participant])
          .toLowerCase()
          .includes(value.toLowerCase())
      );
    });


    // Apply column filters
    Object.entries(this.columnFilters).forEach(([field, value]) => {
      result = result.filter(item => 
        String(item[field as keyof Participant])
          .toLowerCase()
          .includes(value.toLowerCase())
      );
    });


    // Apply global filter
    if (this.filterText) {
      const searchText = this.filterText.toLowerCase();
      result = result.filter(item => {
        return Object.keys(item).some(key => {
          const value = String(item[key as keyof Participant]).toLowerCase();
          return value.includes(searchText);
        });
      });
    }

    // Apply column filters
    Object.entries(this.columnFilters).forEach(([field, value]) => {
      if (value) {
        result = result.filter(item => 
          String(item[field as keyof Participant])
            .toLowerCase()
            .includes(value.toLowerCase())
        );
      }
    });

    // Apply selected filter options
    Object.entries(this.selectedFilterOptions).forEach(([field, options]) => {
      if (options.size > 0) {
        result = result.filter(item => 
          options.has(String(item[field as keyof Participant]))
        );
      }
    });

    // Apply sorting
    if (this.sortField) {
      result.sort((a, b) => {
        const aVal = String(a[this.sortField!]);
        const bVal = String(b[this.sortField!]);
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    // Apply data size limit
    const rowCount = parseInt(this.selectedDataSize.split(' ')[1], 10);
    this.filteredData = result.slice(0, rowCount);
    this.currentPage = 1;
    this.updateDisplayData();
  }

  updateDisplayData(): void {
    this.displayedData = this.getGroupedData();
  }

  getGroupedData(): DataItem[] {
    if (this.rowGroups.length === 0) return this.filteredData;

    const groupedData: DataItem[] = [];
    const groups = new Map<string, Participant[]>();

    const groupField = this.rowGroups[0];
    this.filteredData.forEach(item => {
      const groupValue = String(item[groupField]);
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(item);
    });

    groups.forEach((items, groupValue) => {
      groupedData.push({
        isGroup: true,
        groupField,
        groupValue,
        count: items.length
      });

      if (this.expandedGroups.has(groupValue)) {
        items.forEach(item => groupedData.push(item));
      }
    });

    return groupedData;
  }

  // UI helpers
  closeAllDropdowns(): void {
    this.activeColumnMenu = null;
    this.isColumnVisibilityOpen = false;
    this.activeDropdown = null;
    this.activeFilterDropdown = null;
  }

  // Sorting methods
  sortDescending(col: ColumnDef): void {
    this.sortField = col.field;
    this.sortDirection = 'desc';
    this.applyFiltersAndSort();
  }

  // Column management
  resetColumn(field: keyof Participant): void {
    delete this.columnFilters[field];
    this.selectedFilterOptions[field]?.clear();
    this.sortField = null;
    this.applyFiltersAndSort();
  }

  setColumnFilterValue(field: keyof Participant, value: string): void {
    if (value) {
      this.columnFilters[field] = value;
    } else {
      delete this.columnFilters[field];
    }
    this.applyFiltersAndSort();
  }

  // Filter dropdown methods
  toggleFilterDropdown(field: string, event: Event): void {
    event.stopPropagation();
    this.activeFilterDropdown = this.activeFilterDropdown === field ? null : field;
  }

  isFilterDropdownOpen(field: string): boolean {
    return this.activeFilterDropdown === field;
  }

  // Filter options management
  filterSearchTexts: { [key: string]: string } = {};

  getFilterOptions(field: string): string[] {
    const options = Array.from(this.filterOptions[field] || []);
    const searchText = this.filterSearchTexts[field]?.toLowerCase();
    if (searchText) {
      return options.filter(option => option.toLowerCase().includes(searchText));
    }
    return options.sort((a, b) => a.localeCompare(b));
  }

  isFilterOptionSelected(field: string, option: string): boolean {
    return this.selectedFilterOptions[field]?.has(option) || false;
  }
  toggleFilterOption(field: string, option: string) {
    if (!this.selectedFilterOptions[field]) {
      this.selectedFilterOptions[field] = new Set();
    }

    // Toggle the option in the selected options set
    if (this.selectedFilterOptions[field].has(option)) {
      this.selectedFilterOptions[field].delete(option);
    } else {
      this.selectedFilterOptions[field].add(option);
    }

    this.applyFilters();
  }
  


  selectAllFilterOptions(field: string) {
    if (!this.selectedFilterOptions[field]) {
      this.selectedFilterOptions[field] = new Set();
    }
    
    const allOptions = this.getFilterOptions(field);
    allOptions.forEach(option => {
      this.selectedFilterOptions[field].add(option);
    });
    
    this.applyFilters();
  }
  clearFilterOptions(field: string) {
    if (this.selectedFilterOptions[field]) {
      this.selectedFilterOptions[field].clear();
      this.applyFilters();
    }
  }
private applyFilters() {
    // Start with all data
    let filtered = this.data;

    // Only apply filters for fields that have selected options
    const activeFilters = Object.entries(this.selectedFilterOptions).filter(([_, options]) => options.size > 0);
    
    if (activeFilters.length > 0) {
      filtered = filtered.filter(item => {
        // Check if the current item should be removed (hidden)
        return !activeFilters.some(([field, selectedOptions]) => {
          const value = item[field as keyof Participant];
          let displayValue: string;

          if (typeof value === 'boolean') {
            displayValue = value ? 'Yes' : 'No';
          } else if (typeof value === 'number') {
            if (field === 'rating') {
              displayValue = '★'.repeat(value);
            } else if (field === 'bankBalance') {
              displayValue = this.formatCurrency(value);
            } else {
              displayValue = String(value);
            }
          } else {
            displayValue = String(value);
          }

          // Return true if this item should be removed (is checked)
          return selectedOptions.has(displayValue);
        });
      });
    }

    this.filteredData = filtered;
    this.currentPage = 1;
    this.updateDisplayData();
  }
  // Group management
  toggleGroup(groupValue: string): void {
    if (this.expandedGroups.has(groupValue)) {
      this.expandedGroups.delete(groupValue);
    } else {
      this.expandedGroups.add(groupValue);
    }
    this.updateDisplayData();
  }

  isGroupExpanded(groupValue: string): boolean {
    return this.expandedGroups.has(groupValue);
  }

  // Column visibility
  isColumnVisible(field: keyof Participant): boolean {
    return this.columnVisibility[field] ?? true;
  }

  // Field display
  getFieldClasses(item: DataItem, col: ColumnDef): string {
    if (!this.isParticipantItem(item)) return '';
    return '';
  }

  getFieldContent(item: DataItem, col: ColumnDef): string {
    if (!this.isParticipantItem(item)) return '';
    if (this.rowGroups.includes(col.field)) return '';
    return this.getStringFieldValue(item, col.field);
  }

  // Field value getters
  getFieldValue(item: DataItem, field: keyof Participant): string | number | boolean | undefined {
    if (!this.isParticipantItem(item)) return undefined;
    return item[field];
  }

  getStringFieldValue(item: DataItem, field: keyof Participant): string {
    const value = this.getFieldValue(item, field);
    return value !== undefined ? String(value) : '';
  }

  // Pagination
  get paginatedData(): DataItem[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.displayedData.slice(startIndex, endIndex);
    this.paginatedData = this.rawData.map((participant: any) => ({
  ...participant,
  chartOptions: this.generateChartOptions(participant)  // 👈 Add this field
}));

  }

  get totalPages(): number {
    return Math.ceil(this.displayedData.length / this.pageSize);
  }

  // UI state properties
  dataSizes: string[] = ['row 5 col 22', 'row 10 col 22', 'row 15 col 22', 'row 20 col 22', 'row 25 col 22','row 1000 col 22','row 10000 col 22',];
  themes: string[] = ['Quartz', 'Dark', 'Light'];

  // Column menu methods
  toggleColumnMenu(field: string, event: Event): void {
    event.stopPropagation();
    this.activeColumnMenu = this.activeColumnMenu === field ? null : field;
  }

  isColumnMenuOpen(field: string): boolean {
    return this.activeColumnMenu === field;
  }

  // Theme and data size methods
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  onDataSizeChange(newSize: string): void {
    this.selectedDataSize = newSize;
    const rowCount = parseInt(newSize.split(' ')[1], 10);
    this.filteredData = this.data.slice(0, rowCount);
    this.applyFiltersAndSort();
  }

  // Column visibility methods
  toggleColumnVisibilityDropdown(event: Event): void {
    event.stopPropagation();
    this.isColumnVisibilityOpen = !this.isColumnVisibilityOpen;
  }

  toggleColumnVisibility(field: keyof Participant): void {
    this.columnVisibility[field] = !this.columnVisibility[field];
  }

  // Event handlers
  handleDropdownClick(event: Event): void {
    event.stopPropagation();
  }

  handleCheckboxClick(event: Event): void {
    event.stopPropagation();
  }

  // Column grouping methods
  getColumnsByGroup(): { [group: string]: ColumnDef[] } {
    const grouped: { [group: string]: ColumnDef[] } = {};
    this.columnGroups.forEach(group => {
      grouped[group.name] = this.columns.filter(col => col.group === group.name);
    });
    return grouped;
  }

  isColumnGroupVisible(group: ColumnGroup): boolean {
    return group.columns.some(field => this.isColumnVisible(field as keyof Participant));
  }

  getColumnGroupColspan(group: ColumnGroup): number {
    return group.columns.filter(field => this.isColumnVisible(field as keyof Participant)).length;
  }

  // Column sorting
  sortAscending(col: ColumnDef): void {
    this.sortField = col.field;
    this.sortDirection = 'asc';
    this.applyFiltersAndSort();
  }

  // Row selection
  isAllSelected(): boolean {
    return this.filteredData.length > 0 && this.filteredData.every(item => this.hiddenRows.has(this.getRowId(item)));
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.filteredData.forEach(item => {
        const id = this.getRowId(item);
        if (id !== -1) {
          this.hiddenRows.delete(id);
          this.selectedRows.delete(id);
        }
      });
    } else {
      this.filteredData.forEach(item => {
        const id = this.getRowId(item);
        if (id !== -1) {
          this.hiddenRows.add(id);
          this.selectedRows.add(id);
        }
      });
    }
    this.updateDisplayData();
  }

  // Column ordering
  getOrderedColumns(): ColumnDef[] {
    return this.columnOrder
      .map(field => this.columns.find(col => col.field === field))
      .filter((col): col is ColumnDef => col !== undefined);
  }

  // Drag and drop handlers
  onDragStart(event: DragEvent, column: ColumnDef): void {
    if (!column.groupable) return;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', column.field);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const field = event.dataTransfer?.getData('text/plain') as keyof Participant;
    if (field && !this.rowGroups.includes(field)) {
      this.rowGroups.push(field);
      this.updateDisplayData();
    }
  }

  // Column drag and drop
  onColumnDragStart(event: DragEvent, column: ColumnDef): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', column.field);
    }
  }

  onColumnDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onColumnDrop(event: DragEvent, targetColumn: ColumnDef): void {
    event.preventDefault();
    const sourceField = event.dataTransfer?.getData('text/plain') as keyof Participant;
    const targetField = targetColumn.field;
    if (sourceField && targetField) {
      const sourceIndex = this.columnOrder.indexOf(sourceField);
      const targetIndex = this.columnOrder.indexOf(targetField);
      this.columnOrder.splice(sourceIndex, 1);
      this.columnOrder.splice(targetIndex, 0, sourceField);
    }
  }

  // Group drag and drop
  onGroupDragStart(event: DragEvent, group: ColumnGroup): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', group.name);
    }
  }

  onGroupDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onGroupDrop(event: DragEvent, targetGroup: ColumnGroup): void {
    event.preventDefault();
    const sourceGroupName = event.dataTransfer?.getData('text/plain');
    if (sourceGroupName && sourceGroupName !== targetGroup.name) {
      const sourceIndex = this.columnGroups.findIndex(g => g.name === sourceGroupName);
      const targetIndex = this.columnGroups.findIndex(g => g.name === targetGroup.name);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const [movedGroup] = this.columnGroups.splice(sourceIndex, 1);
        this.columnGroups.splice(targetIndex, 0, movedGroup);
      }
    }
  }

  // Column management
  getColumnHeader(field: keyof Participant): string {
    return this.columns.find(col => col.field === field)?.header || field;
  }

  removeRowGroup(field: keyof Participant): void {
    this.rowGroups = this.rowGroups.filter(f => f !== field);
    this.updateDisplayData();
  }

  getGameTooltip(gameName: string): string {
    return gameName;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getColumnGroup(field: keyof Participant): string | undefined {
    return this.columns.find(col => col.field === field)?.group;
  }
}
