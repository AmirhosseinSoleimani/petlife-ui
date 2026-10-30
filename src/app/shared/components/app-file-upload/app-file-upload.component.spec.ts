import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AppFileUploadComponent } from './app-file-upload.component';

describe('Pet image preview lifecycle', () => {
  it('trusts a validated local object URL and revokes it on clear', () => {
    const sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustUrl']);
    sanitizer.bypassSecurityTrustUrl.and.callFake(url => url as unknown as SafeUrl);
    const component = new AppFileUploadComponent(sanitizer);
    component.showImagePreview = true;
    component.allowedExtensions = ['.jpg'];
    component.allowedContentTypes = ['image/jpeg'];
    component.maxSizeBytes = 5 * 1024 * 1024 - 1;

    const createUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:local-pet-preview');
    const revokeUrl = spyOn(URL, 'revokeObjectURL');
    const file = new File(['photo'], 'pet.jpg', { type: 'image/jpeg' });
    component.onFileSelected({ target: { files: [file], value: 'selected' } } as unknown as Event);

    expect(createUrl).toHaveBeenCalledWith(file);
    expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('blob:local-pet-preview');
    expect(component.selectedFileViews[0].previewUrl).not.toBeNull();
    component.clearSelection();
    expect(revokeUrl).toHaveBeenCalledWith('blob:local-pet-preview');
  });
});
