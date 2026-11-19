export type ChoirCoreEvent = 'track' | 'trackClosed' | 'reaction' | 'recordingState' | 'cue' | 'disconnected' | 'error';
export type ChoirCoreTrackInfo = {
  track: MediaStreamTrack;
  producerId: string;
  name: string;
  section: string;
};
export type ChoirCoreReaction = {emoji:string;from:string;role:string};
export type ChoirCoreRecordingState = {active:boolean;by:string;own:boolean;reason:string;revision:number};
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
  on(event: 'reaction', cb: (event: ChoirCoreReaction) => void): () => void;
  on(event: 'recordingState', cb: (event: ChoirCoreRecordingState) => void): () => void;
  on(event: 'cue', cb: (event: { message: string }) => void): () => void;
  on(event: 'disconnected', cb: () => void): () => void;
  on(event: 'error', cb: (error: unknown) => void): () => void;
  connect(options: ChoirCoreJoinOptions): Promise<void>;
  react(emoji:string):Promise<unknown>;
  startRecording(revision:number):Promise<unknown>;
  stopRecording():Promise<unknown>;
  cue(message: string): Promise<unknown>;
  getNetworkStats(): Promise<{roundTripMs: number | null; jitterMs: number | null; packetsLost: number; packetsReceived: number}>;
  publish(track: MediaStreamTrack, section?: string): Promise<unknown>;
  close(): void;
}
