import React, { useState, useCallback } from 'react';
import { AppPhase } from './constants';
import type { Participant, BracketData, Match, ChampionshipStanding } from './types';
import QualificationView from './components/QualificationView';
import TournamentBracket from './components/TournamentBracket';
import ChampionshipView from './components/ChampionshipView';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.CHAMPIONSHIP_VIEW);
  const [championshipStandings, setChampionshipStandings] = useState<ChampionshipStanding[]>([]);
  const [competitionParticipants, setCompetitionParticipants] = useState<Participant[]>([]);
  const [bracket, setBracket] = useState<BracketData>([]);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState<Match | null>(null);

  const [totalCompetitions, setTotalCompetitions] = useState<number | null>(null);
  const [competitionsHeld, setCompetitionsHeld] = useState<number>(0);

  const handleStartCompetition = useCallback(() => {
    const participantsForCompetition = championshipStandings.map(p => ({
      id: p.id,
      name: p.name,
      score: null,
      seed: 0,
    }));
    setCompetitionParticipants(participantsForCompetition);
    setBracket([]);
    setThirdPlaceMatch(null);
    setPhase(AppPhase.QUALIFICATION);
  }, [championshipStandings]);

  const handleStartBracket = useCallback((allParticipants: Participant[]) => {
    const qualifiedParticipants = allParticipants
      .filter(p => p.score !== null && p.score > 0)
      .sort((a, b) => (b.score as number) - (a.score as number))
      .map((p, index) => ({ ...p, seed: index + 1 }));

    const MIN_PARTICIPANTS = 2;
    if (qualifiedParticipants.length < MIN_PARTICIPANTS) {
      alert(`Tabeli genereerimiseks on vaja vähemalt ${MIN_PARTICIPANTS} osalejat, kelle tulemus on suurem kui 0.`);
      return;
    }

    const bracketSize = Math.pow(2, Math.ceil(Math.log2(qualifiedParticipants.length)));
    const participantMap = new Map<number, Participant>();
    qualifiedParticipants.forEach(p => participantMap.set(p.seed, p));

    let seeds: number[] = [1];
    while (seeds.length < bracketSize) {
      const nextSeeds: number[] = [];
      const currentBracketSize = seeds.length * 2;
      for (const seed of seeds) {
        nextSeeds.push(seed);
        nextSeeds.push(currentBracketSize + 1 - seed);
      }
      seeds = nextSeeds;
    }
    const finalSeedOrder = seeds;

    const newBracket: BracketData = [];
    let matchIdCounter = 0;

    const firstRound: Match[] = [];
    for (let i = 0; i < finalSeedOrder.length; i += 2) {
      const p1Seed = finalSeedOrder[i];
      const p2Seed = finalSeedOrder[i + 1];

      const participant1 = participantMap.get(p1Seed) || null;
      const participant2 = participantMap.get(p2Seed) || null;

      let winner = null;
      if (participant1 && !participant2) {
        winner = participant1;
      } else if (!participant1 && participant2) {
        winner = participant2;
      }

      firstRound.push({
        id: matchIdCounter++,
        roundIndex: 0,
        matchIndex: i / 2,
        participant1,
        participant2,
        winner,
        nextMatchId: null,
      });
    }
    newBracket.push(firstRound);

    let numMatchesInPreviousRound = bracketSize / 2;
    const numRounds = Math.log2(bracketSize);

    for (let roundIndex = 1; roundIndex < numRounds; roundIndex++) {
      const previousRound = newBracket[roundIndex - 1];
      const numMatchesInCurrentRound = numMatchesInPreviousRound / 2;
      const currentRound: Match[] = [];

      for (let matchIndex = 0; matchIndex < numMatchesInCurrentRound; matchIndex++) {
        let p1 = previousRound[matchIndex * 2]?.winner;
        let p2 = previousRound[matchIndex * 2 + 1]?.winner;

        if (p1 && p2 && p1.seed > p2.seed) {
            [p1, p2] = [p2, p1];
        }

        currentRound.push({
          id: matchIdCounter++,
          roundIndex,
          matchIndex,
          participant1: p1 || null,
          participant2: p2 || null,
          winner: null,
          nextMatchId: null,
        });
      }

      for (let i = 0; i < previousRound.length; i++) {
        previousRound[i].nextMatchId = currentRound[Math.floor(i / 2)].id;
      }

      newBracket.push(currentRound);
      numMatchesInPreviousRound = numMatchesInCurrentRound;
    }

    setBracket(newBracket);
    setPhase(AppPhase.BRACKET);
  }, []);

  const handleSetWinner = useCallback((matchId: number, winner: Participant) => {
    if (thirdPlaceMatch && matchId === thirdPlaceMatch.id) {
        setThirdPlaceMatch(prevMatch => {
            if (prevMatch) {
                const newMatch = { ...prevMatch, winner };
                const finalMatch = bracket[bracket.length - 1]?.[0];
                if (finalMatch?.winner) {
                    setPhase(AppPhase.FINISHED);
                }
                return newMatch;
            }
            return null;
        });
        return;
    }

    setBracket(prevBracket => {
        const newBracket = JSON.parse(JSON.stringify(prevBracket));
        let matchToUpdate: Match | null = null;
        let roundIndexOfMatch = -1;
        
        for (let i = 0; i < newBracket.length; i++) {
            const round = newBracket[i];
            const foundMatch = round.find(m => m.id === matchId);
            if (foundMatch) {
                matchToUpdate = foundMatch;
                roundIndexOfMatch = i;
                break;
            }
        }

        if (matchToUpdate && !matchToUpdate.winner) {
            matchToUpdate.winner = winner;

            if (matchToUpdate.nextMatchId !== null) {
                let nextMatch: Match | null = null;
                for (const round of newBracket) {
                    nextMatch = round.find(m => m.id === matchToUpdate.nextMatchId) || null;
                    if (nextMatch) break;
                }

                if (nextMatch) {
                    if (matchToUpdate.matchIndex % 2 === 0) {
                        nextMatch.participant1 = winner;
                    } else {
                        nextMatch.participant2 = winner;
                    }

                    if (nextMatch.participant1 && nextMatch.participant2) {
                        if (nextMatch.participant1.seed > nextMatch.participant2.seed) {
                            [nextMatch.participant1, nextMatch.participant2] = [nextMatch.participant2, nextMatch.participant1];
                        }
                    }
                }
            } else {
                if (thirdPlaceMatch?.winner || bracket.length <= 1) {
                    setPhase(AppPhase.FINISHED);
                }
            }
            
            const numRounds = newBracket.length;
            if (numRounds > 1 && roundIndexOfMatch === numRounds - 2) {
                const semiFinals = newBracket[numRounds - 2];
                if (semiFinals[0]?.winner && semiFinals[1]?.winner) {
                    const loser1 = semiFinals[0].participant1?.id === semiFinals[0].winner.id ? semiFinals[0].participant2 : semiFinals[0].participant1;
                    const loser2 = semiFinals[1].participant1?.id === semiFinals[1].winner.id ? semiFinals[1].participant2 : semiFinals[1].participant1;
                    
                    if (loser1 && loser2) {
                        const p1 = loser1.seed < loser2.seed ? loser1 : loser2;
                        const p2 = loser1.seed < loser2.seed ? loser2 : loser1;
                        setThirdPlaceMatch({
                            id: 999,
                            roundIndex: -1,
                            matchIndex: 0,
                            participant1: p1,
                            participant2: p2,
                            winner: null,
                            nextMatchId: null,
                        });
                    }
                }
            }
        }
        
        return newBracket;
    });
  }, [bracket, thirdPlaceMatch]);

  const calculateAndApplyPoints = useCallback(() => {
    const pointsToAdd = new Map<number, number>();
    championshipStandings.forEach(p => pointsToAdd.set(p.id, 0));

    // 1. Qualification points
    const qualified = competitionParticipants
      .filter(p => p.score !== null && p.score > 0)
      .sort((a, b) => (b.score as number) - (a.score as number));
    
    qualified.forEach((p, index) => {
      const rank = index + 1;
      let points = 0;
      if (rank === 1) points = 12;
      else if (rank === 2) points = 10;
      else if (rank === 3) points = 8;
      else if (rank === 4) points = 6;
      else if (rank >= 5 && rank <= 6) points = 4;
      else if (rank >= 7 && rank <= 8) points = 3;
      else if (rank >= 9 && rank <= 12) points = 2;
      else if (rank >= 13 && rank <= 16) points = 1;
      else if (rank >= 17 && rank <= 24) points = 0.5;
      else if (rank >= 25 && rank <= 32) points = 0.25;

      pointsToAdd.set(p.id, (pointsToAdd.get(p.id) || 0) + points);
    });

    // 2. Main competition points
    const numRounds = bracket.length;
    const finalMatch = bracket[numRounds - 1]?.[0];

    const winner = finalMatch?.winner;
    const runnerUp = finalMatch?.participant1?.id === winner?.id ? finalMatch?.participant2 : finalMatch?.participant1;
    const thirdPlace = thirdPlaceMatch?.winner;
    const fourthPlace = thirdPlaceMatch?.participant1?.id === thirdPlace?.id ? thirdPlaceMatch?.participant2 : thirdPlaceMatch?.participant1;

    if (winner) pointsToAdd.set(winner.id, (pointsToAdd.get(winner.id) || 0) + 100);
    if (runnerUp) pointsToAdd.set(runnerUp.id, (pointsToAdd.get(runnerUp.id) || 0) + 88);
    if (thirdPlace) pointsToAdd.set(thirdPlace.id, (pointsToAdd.get(thirdPlace.id) || 0) + 76);
    if (fourthPlace) pointsToAdd.set(fourthPlace.id, (pointsToAdd.get(fourthPlace.id) || 0) + 64);

    const pointMapping = [
      { roundParticipants: 8, points: 48 },   // 5-8th place
      { roundParticipants: 16, points: 32 },  // 9-16th place
      { roundParticipants: 32, points: 16 },  // 17-32nd place
      { roundParticipants: 64, points: 10 },  // 33-64th place
    ];

    const top4Ids = new Set([winner?.id, runnerUp?.id, thirdPlace?.id, fourthPlace?.id].filter(Boolean));

    for (const mapping of pointMapping) {
      // Find the round where losers for this tier were determined.
      // e.g., for top 8 losers (5-8th), we need the quarter-final round (4 matches).
      const roundIndex = bracket.findIndex(r => r.length * 2 === mapping.roundParticipants);
      
      if (roundIndex !== -1) {
        const round = bracket[roundIndex];
        round.forEach(match => {
          const loser = match.winner?.id === match.participant1?.id ? match.participant2 : match.participant1;
          if (loser && !top4Ids.has(loser.id)) {
            pointsToAdd.set(loser.id, (pointsToAdd.get(loser.id) || 0) + mapping.points);
          }
        });
      }
    }

    setChampionshipStandings(prev => {
      const newStandings = prev.map(standing => {
        const pointsForThisCompetition = pointsToAdd.get(standing.id) || 0;
        return {
          ...standing,
          pointsPerCompetition: [...standing.pointsPerCompetition, pointsForThisCompetition],
        };
      });

      return newStandings.sort((a, b) => {
        const totalA = a.pointsPerCompetition.reduce((sum, p) => sum + p, 0);
        const totalB = b.pointsPerCompetition.reduce((sum, p) => sum + p, 0);
        return totalB - totalA;
      });
    });
  }, [competitionParticipants, bracket, thirdPlaceMatch, championshipStandings]);

  const handleReturnToChampionship = useCallback(() => {
    calculateAndApplyPoints();
    setCompetitionsHeld(prev => prev + 1);
    setPhase(AppPhase.CHAMPIONSHIP_VIEW);
  }, [calculateAndApplyPoints]);

  const handleResetChampionship = useCallback(() => {
    setChampionshipStandings(prev => prev.map(p => ({ ...p, pointsPerCompetition: [] })));
    setCompetitionsHeld(0);
    setTotalCompetitions(null);
    setPhase(AppPhase.CHAMPIONSHIP_VIEW);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          Salajase pleistaühingu DMEC
        </h1>
      </header>
      <main>
        {phase === AppPhase.CHAMPIONSHIP_VIEW && (
            <ChampionshipView 
                standings={championshipStandings}
                setStandings={setChampionshipStandings}
                onStartCompetition={handleStartCompetition}
                totalCompetitions={totalCompetitions}
                setTotalCompetitions={setTotalCompetitions}
                competitionsHeld={competitionsHeld}
                onResetChampionship={handleResetChampionship}
            />
        )}
        {phase === AppPhase.QUALIFICATION && (
          <QualificationView 
            participants={competitionParticipants} 
            setParticipants={setCompetitionParticipants}
            onStartBracket={handleStartBracket}
            setChampionshipStandings={setChampionshipStandings}
            competitionsHeld={competitionsHeld}
          />
        )}
        {(phase === AppPhase.BRACKET || phase === AppPhase.FINISHED) && (
          <TournamentBracket 
            participants={competitionParticipants}
            bracketData={bracket} 
            thirdPlaceMatch={thirdPlaceMatch}
            onSetWinner={handleSetWinner} 
            phase={phase}
            onReturnToChampionship={handleReturnToChampionship}
          />
        )}
      </main>
    </div>
  );
};

export default App;