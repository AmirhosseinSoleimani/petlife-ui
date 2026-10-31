import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { AiService } from './ai.service';

describe('AiService general ask contract', () => {
  let ai: AiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiService, ApiService]
    });
    ai = TestBed.inject(AiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses /api/ai/ask and accepts stateless general answers', () => {
    let answer = '';
    ai.ask({ message: 'How do I care for a kitten?', conversationId: null })
      .subscribe(response => answer = response.data.answer);

    const request = http.expectOne('/api/ai/ask');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      message: 'How do I care for a kitten?', conversationId: null
    });
    request.flush({ success: true, data: { answer: 'Provide food and clean water.' } });
    expect(answer).toBe('Provide food and clean water.');
  });
});
