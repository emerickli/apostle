// The picture at the top of a person's card. A default avatar by gender until a photo is added.
// Click it, or drop an image on it, to set a photo.

import { useState } from 'react';
import type { Gender, Person } from '../core/model';
import { pickFile, squarePhoto } from '../platform/browser';
import { useStore } from './store-context';
import female from '../assets/avatars/female.png';
import male from '../assets/avatars/male.png';
import other from '../assets/avatars/nonbinary.png';

export const DEFAULT_AVATAR: Record<Gender, string> = { female, male, other };

export function Avatar({ person, onError }: { person: Person; onError: (message: string) => void }) {
  const store = useStore();
  const [over, setOver] = useState(false);

  const use = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { onError('That file is not an image.'); return; }
    try {
      store.updatePerson(person.id, { photo: await squarePhoto(file) });
    } catch {
      onError('That image could not be read.');
    }
  };

  return (
    <button
      className={`avatar ${person.photo ? 'has-photo' : ''} ${over ? 'is-over' : ''}`}
      onClick={async () => use(await pickFile('image/*'))}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void use(e.dataTransfer.files[0]); }}
      aria-label={person.photo ? 'Change photo' : 'Add photo'}
    >
      <img src={person.photo ?? DEFAULT_AVATAR[person.gender]} alt="" draggable={false} />
      <span className="avatar-hint">{person.photo ? 'Change photo' : 'Add photo'}</span>
    </button>
  );
}
