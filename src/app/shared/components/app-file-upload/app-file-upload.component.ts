import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface SelectedFileView {
  file: File;
  previewUrl: SafeUrl | null;
  objectUrl: string | null;
}

@Component({
  selector: 'app-file-upload',
  templateUrl: './app-file-upload.component.html',
  styleUrls: ['./app-file-upload.component.scss']
})
export class AppFileUploadComponent implements OnDestroy {
  constructor(private readonly sanitizer: DomSanitizer) {}
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  @Input() accept = '';
  @Input() allowedExtensions: string[] = [];
  @Input() allowedContentTypes: string[] = [];
  @Input() allowedTypesLabelKey = '';
  @Input() maxSizeBytes = 0;
  @Input() loading = false;
  @Input() multiple = false;
  @Input() showImagePreview = false;
  @Output() readonly filesChange = new EventEmitter<File[]>();

  selectedFileViews: SelectedFileView[] = [];
  errorKey = '';

  get maxSizeMegabytes(): number {
    return this.maxSizeBytes / (1024 * 1024);
  }

  get selectedFiles(): File[] {
    return this.selectedFileViews.map((item) => item.file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.clearSelectedFiles();
    this.errorKey = '';

    if (!files.length) {
      this.filesChange.emit([]);
      return;
    }

    for (const file of this.multiple ? files : files.slice(0, 1)) {
      const validationError = this.validateFile(file);
      if (validationError) {
        this.errorKey = validationError;
        continue;
      }

      const objectUrl = this.showImagePreview && file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null;
      this.selectedFileViews.push({
        file,
        objectUrl,
        previewUrl: objectUrl ? this.sanitizer.bypassSecurityTrustUrl(objectUrl) : null
      });
    }

    if (!this.selectedFileViews.length) {
      input.value = '';
    }

    this.filesChange.emit(this.selectedFiles);
  }

  removeSelectedFile(index: number): void {
    const [removed] = this.selectedFileViews.splice(index, 1);
    this.revokePreview(removed?.objectUrl);
    this.errorKey = '';
    if (!this.selectedFileViews.length && this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.filesChange.emit(this.selectedFiles);
  }

  clearSelection(): void {
    this.clearSelectedFiles();
    this.errorKey = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.filesChange.emit([]);
  }

  ngOnDestroy(): void {
    this.clearSelectedFiles();
  }

  private validateFile(file: File): string {
    const extension = this.getExtension(file.name);
    const allowedExtensions = this.allowedExtensions.map((value) => value.toLowerCase());
    const allowedContentTypes = this.allowedContentTypes.map((value) => value.toLowerCase());
    const hasInvalidExtension = allowedExtensions.length > 0 && !allowedExtensions.includes(extension);
    const hasInvalidContentType = allowedContentTypes.length > 0
      && !!file.type
      && !allowedContentTypes.includes(file.type.toLowerCase());

    if (hasInvalidExtension || hasInvalidContentType) {
      return 'files.invalidFileType';
    }
    if (file.size <= 0) {
      return 'files.emptyFile';
    }
    if (this.maxSizeBytes > 0 && file.size > this.maxSizeBytes) {
      return 'files.fileTooLarge';
    }
    return '';
  }

  private clearSelectedFiles(): void {
    this.selectedFileViews.forEach((item) => this.revokePreview(item.objectUrl));
    this.selectedFileViews = [];
  }

  private revokePreview(previewUrl: string | null | undefined): void {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private getExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : '';
  }
}
