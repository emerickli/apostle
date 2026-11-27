// The picture at the top of a person's card. One of three default avatars until a photo is added.
// Click it, or drop an image on it, to set a photo.

import { useState } from 'react';
import type { AvatarId, Person } from '../core/model';
import { pickFile, squarePhoto } from '../platform/browser';
import { useStore } from './store-context';
import avatar1 from '../assets/avatars/avatar-1.png';
import avatar2 from '../assets/avatars/avatar-2.png';
import avatar3 from '../assets/avatars/avatar-3.png';

export const DEFAULT_AVATAR: Record<AvatarId, string> = { 1: avatar1, 2: avatar2, 3: avatar3 };

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
      <img src={person.photo ?? DEFAULT_AVATAR[person.avatar]} alt="" draggable={false} />
      <span className="avatar-hint">{person.photo ? 'Change photo' : 'Add photo'}</span>
    </button>
  );
}
