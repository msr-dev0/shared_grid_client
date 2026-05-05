export type Block = {
  id: number;
  x: number;
  y: number;
  ownerId: string | null;
  ownerColor: string | null;
  ownerName: string | null;
};

export type User = {
  id: string;
  name: string;
  color: string;
  score: number;
  isGuest: boolean;
  token: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  color: string;
  score: number;
};
