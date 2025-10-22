
export interface TranscriptionTurn {
  speaker: 'You' | 'Model';
  text: string;
  isFinal: boolean;
  id: number;
}
