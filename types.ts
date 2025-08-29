export interface Participant {
  id: number;
  name: string;
  score: number | null;
  seed: number;
}

export interface Match {
  id: number;
  roundIndex: number;
  matchIndex: number;
  participant1: Participant | null;
  participant2: Participant | null;
  winner: Participant | null;
  nextMatchId: number | null;
}

export type Round = Match[];

export type BracketData = Round[];

export interface ChampionshipStanding {
    id: number;
    name: string;
    pointsPerCompetition: number[];
}