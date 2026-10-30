import { mapPetTaxonomySpecies, PetTaxonomySpeciesDto } from './customer-core.models';

describe('Pets independent taxonomy contract', () => {
  it('maps the flat species list without inventing subgroups or breeds', () => {
    const source: PetTaxonomySpeciesDto[] = [
      { id: 'b', code: 'DOG', name: 'Dog', isActive: true, version: 1 },
      { id: 'a', code: 'CAT', name: 'Cat', isActive: true, version: 1 },
      { id: 'inactive', code: 'OLD', name: 'Old', isActive: false, version: 1 }
    ];

    const actual = mapPetTaxonomySpecies(source);

    expect(actual.map(item => item.id)).toEqual(['a', 'b']);
    expect(actual[0].subgroups).toEqual([]);
    expect(actual[0].breeds).toEqual([]);
    expect(actual[0].name).toBe('Cat');
  });

  it('does not treat a child taxonomy record as a species', () => {
    const actual = mapPetTaxonomySpecies([
      { id: 'breed', speciesId: 'species-id', code: 'BREED', name: 'Breed', isActive: true, version: 2 }
    ]);
    expect(actual).toEqual([]);
  });
});
