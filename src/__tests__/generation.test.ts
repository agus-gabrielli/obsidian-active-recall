// import { GenerationService } from '../generation'; // uncomment in Plan 02

describe('GenerationService', () => {

  describe('GEN-01: Note collection', () => {
    test.todo('collects top-level .md files from a folder, excludes _self-test.md, excludes subfolders');
  });

  describe('GEN-02 / GEN-03: Prompt structure', () => {
    test.todo('prompt instructs LLM to order questions foundational to advanced');
    test.todo('prompt instructs LLM to omit category headings when content is too simple or narrow');
  });

  describe('GEN-04 / GEN-05: Callout syntax in prompt', () => {
    test.todo('prompt includes > [!hint]- syntax instruction when generateHints is true');
    test.todo('prompt includes > [!check]- syntax instruction when generateReferenceAnswers is true');
  });

  describe('GEN-06: Concept map', () => {
    test.todo('prompt includes concept map instruction when generateConceptMap is true');
    test.todo('prompt omits concept map instruction when generateConceptMap is false');
  });

  describe('GEN-07: File write', () => {
    test.todo('calls vault.create() when _self-test.md does not exist');
    test.todo('calls vault.modify() when _self-test.md already exists');
  });

  describe('CTX-01 / CTX-02 / CTX-03: Token budget', () => {
    test.todo('estimateTokens returns Math.ceil(chars / 4)');
    test.todo('makes a single API call when total note content fits within the token budget');
    test.todo('makes multiple batch calls plus a synthesis call when content exceeds the token budget');
  });

  describe('FB-01 / FB-02: Feedback', () => {
    test.todo('status bar setText is called with progress string and cleared in finally block');
    test.todo('maps status 401 to plain-language error; does not expose raw API error string');
  });

});
