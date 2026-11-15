export type ChoirCoreEvent = 'track' | 'trackClosed' | 'cue' | 'disconnected' | 'error';
export type ChoirCoreTrackInfo = {
  track: MediaStreamTrack;
  producerId: string;
  name: string;
  section: string;
};
export type ChoirCoreTrackClosed = { producerId: string };
export type ChoirCoreJoinOptions = {
  room: string;
  name: string;
  secret: string;
  role?: string;
  section?: string;
};
export declare class ChoirCoreClient {
  constructor(url: string, options?: { timeoutMs?: number });
  on(event: 'track', cb: (event: ChoirCoreTrackInfo) => void): () => void;
  on(event: 'trackClosed', cb: (event: ChoirCoreTrackClosed) => void): () => void;
  on(event: 'cue', cb: (event: { message: string }) => void): () => void;
  on(event: 'disconnected', cb: () => void): () => void;
  on(event: 'error', cb: (error: unknown) => void): () => void;
  connect(options: ChoirCoreJoinOptions): Promise<void>;
  cue(message: string): Promise<unknown>;
  publish(track: MediaStreamTrack, section?: string): Promise<unknown>;
  close(): void;
}
