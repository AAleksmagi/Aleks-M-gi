import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AppPhase } from './constants';
import type { Participant, BracketData, Match, ChampionshipStanding } from './types';
import QualificationView from './components/QualificationView';
import TournamentBracket from './components/TournamentBracket';
import ChampionshipView from './components/ChampionshipView';
import RegistrationPage from './components/RegistrationPage';

interface AppState {
  phase: AppPhase;
  standings: ChampionshipStanding[];
  competitionParticipants: Participant[];
  bracket: BracketData;
  thirdPlaceMatch: Match | null;
  totalCompetitions: number | null;
  competitionsHeld: number;
}

const getInitialState = (): AppState => {
  return {
    phase: AppPhase.CHAMPIONSHIP_VIEW,
    standings: [],
    competitionParticipants: [],
    bracket: [],
    thirdPlaceMatch: null,
    totalCompetitions: null,
    competitionsHeld: 0,
  };
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(getInitialState);
  const [registrationSessionId, setRegistrationSessionId] = useState<string | null>(null);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionParam = useMemo(() => urlParams.get('session'), [urlParams]);

  useEffect(() => {
    if (!sessionParam && registrationSessionId) {
        const eventSource = new EventSource(`https://ntfy.sh/${registrationSessionId}/sse`);

        eventSource.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const newParticipantData = JSON.parse(message.message);

                if (newParticipantData && newParticipantData.id && newParticipantData.name) {
                    setAppState(prev => {
                        const isDuplicate = prev.standings.some(p => p.name.toLowerCase() === newParticipantData.name.toLowerCase());
                        if (isDuplicate) {
                            console.warn(`Duplicate registration rejected: ${newParticipantData.name}`);
                            return prev;
                        }

                        const newParticipant: ChampionshipStanding = {
                            ...newParticipantData,
                            pointsPerCompetition: Array(prev.competitionsHeld).fill(0),
                        };

                        return { ...prev, standings: [...prev.standings, newParticipant] };
                    });
                }
            } catch (e) {
                console.error("Failed to process registration message:", e);
            }
        };

        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }
  }, [registrationSessionId, sessionParam]);


  const { phase, standings, competitionParticipants, bracket, thirdPlaceMatch, totalCompetitions, competitionsHeld } = appState;
  
  const setStandings = useCallback((updater: React.SetStateAction<ChampionshipStanding[]>) => {
     setAppState(prev => {
        const newStandings = typeof updater === 'function' ? updater(prev.standings) : updater;
        return { ...prev, standings: newStandings };
    });
  }, []);

   const setCompetitionParticipants = useCallback((updater: React.SetStateAction<Participant[]>) => {
     setAppState(prev => {
        const newParticipants = typeof updater === 'function' ? updater(prev.competitionParticipants) : updater;
        return { ...prev, competitionParticipants: newParticipants };
    });
  }, []);


  const handleStartCompetition = useCallback(() => {
    setAppState(prev => {
        const participantsForCompetition = prev.standings.map(p => ({
          id: p.id,
          name: p.name,
          score: null,
          seed: 0,
        }));
        return {
          ...prev,
          competitionParticipants: participantsForCompetition,
          bracket: [],
          thirdPlaceMatch: null,
          phase: AppPhase.QUALIFICATION,
        }
    });
  }, []);

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
      if (participant1 && !participant2) winner = participant1;
      else if (!participant1 && participant2) winner = participant2;
      firstRound.push({ id: matchIdCounter++, roundIndex: 0, matchIndex: i / 2, participant1, participant2, winner, nextMatchId: null });
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
        if (p1 && p2 && p1.seed > p2.seed) [p1, p2] = [p2, p1];
        currentRound.push({ id: matchIdCounter++, roundIndex, matchIndex, participant1: p1 || null, participant2: p2 || null, winner: null, nextMatchId: null });
      }
      for (let i = 0; i < previousRound.length; i++) {
        previousRound[i].nextMatchId = currentRound[Math.floor(i / 2)].id;
      }
      newBracket.push(currentRound);
      numMatchesInPreviousRound = numMatchesInCurrentRound;
    }
    setAppState(prev => ({...prev, bracket: newBracket, phase: AppPhase.BRACKET}));
  }, []);

  const handleSetWinner = useCallback((matchId: number, winner: Participant) => {
    setAppState(prev => {
        let newThirdPlaceMatch = prev.thirdPlaceMatch;
        let newBracket = JSON.parse(JSON.stringify(prev.bracket));
        let newPhase = prev.phase;

        if (newThirdPlaceMatch && matchId === newThirdPlaceMatch.id) {
            newThirdPlaceMatch = { ...newThirdPlaceMatch, winner };
            const finalMatch = newBracket[newBracket.length - 1]?.[0];
            if (finalMatch?.winner) {
                newPhase = AppPhase.FINISHED;
            }
            return {...prev, thirdPlaceMatch: newThirdPlaceMatch, phase: newPhase };
        }

        let matchToUpdate: Match | null = null;
        for (let i = 0; i < newBracket.length; i++) {
            const foundMatch = newBracket[i].find(m => m.id === matchId);
            if (foundMatch) {
                matchToUpdate = foundMatch;
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
                    if (matchToUpdate.matchIndex % 2 === 0) nextMatch.participant1 = winner;
                    else nextMatch.participant2 = winner;
                    if (nextMatch.participant1 && nextMatch.participant2 && nextMatch.participant1.seed > nextMatch.participant2.seed) {
                        [nextMatch.participant1, nextMatch.participant2] = [nextMatch.participant2, nextMatch.participant1];
                    }
                }
            } else {
                 const finalMatchIsThisOne = matchToUpdate.roundIndex === newBracket.length - 1;
                 const thirdPlaceApplicable = newBracket.length > 1 && newBracket[0].length > 1;

                if (finalMatchIsThisOne) {
                    if (!thirdPlaceApplicable || (newThirdPlaceMatch && newThirdPlaceMatch.winner)) {
                        newPhase = AppPhase.FINISHED;
                    }
                }
            }
            const numRounds = newBracket.length;
            if (numRounds > 1) {
                const semiFinals = newBracket[numRounds - 2];
                if (semiFinals.every(m => m.winner) && !newThirdPlaceMatch) {
                    const findLoser = (match: Match): Participant | null => {
                        if (!match.participant1 || !match.participant2) {
                            return null;
                        }
                        return match.winner?.id === match.participant1.id ? match.participant2 : match.participant1;
                    };

                    const losers = semiFinals.map(findLoser).filter((p): p is Participant => p !== null);
                    
                    if (losers.length === 2) {
                        const [p1, p2] = losers[0].seed < losers[1].seed ? [losers[0], losers[1]] : [losers[1], losers[0]];
                        newThirdPlaceMatch = { id: 999, roundIndex: -1, matchIndex: 0, participant1: p1, participant2: p2, winner: null, nextMatchId: null };
                    } else if (losers.length === 1) {
                        const singleLoser = losers[0];
                        newThirdPlaceMatch = { 
                            id: 999, 
                            roundIndex: -1, 
                            matchIndex: 0, 
                            participant1: singleLoser, 
                            participant2: null, 
                            winner: singleLoser, 
                            nextMatchId: null 
                        };
                    }
                }
            }
        }
        return { ...prev, bracket: newBracket, thirdPlaceMatch: newThirdPlaceMatch, phase: newPhase };
    });
  }, []);

  const handleReturnToChampionship = useCallback(() => {
    setAppState(prev => {
        const { standings, competitionParticipants, bracket, thirdPlaceMatch } = prev;
        const pointsToAdd = new Map<number, number>();
        standings.forEach(p => pointsToAdd.set(p.id, 0));

        const qualified = competitionParticipants.filter(p => p.score !== null && p.score > 0).sort((a, b) => (b.score as number) - (a.score as number));
        qualified.forEach((p, index) => {
            const rank = index + 1;
            let points = 0;
            if (rank === 1) points = 12; else if (rank === 2) points = 10; else if (rank === 3) points = 8; else if (rank === 4) points = 6;
            else if (rank >= 5 && rank <= 6) points = 4; else if (rank >= 7 && rank <= 8) points = 3; else if (rank >= 9 && rank <= 12) points = 2;
            else if (rank >= 13 && rank <= 16) points = 1; else if (rank >= 17 && rank <= 24) points = 0.5; else if (rank >= 25 && rank <= 32) points = 0.25;
            pointsToAdd.set(p.id, (pointsToAdd.get(p.id) || 0) + points);
        });

        const finalMatch = bracket[bracket.length - 1]?.[0];
        const winner = finalMatch?.winner;
        const runnerUp = finalMatch?.participant1?.id === winner?.id ? finalMatch?.participant2 : finalMatch?.participant1;
        const thirdPlace = thirdPlaceMatch?.winner;
        const fourthPlace = thirdPlaceMatch?.participant1?.id === thirdPlace?.id ? thirdPlaceMatch?.participant2 : thirdPlaceMatch?.participant1;
        if (winner) pointsToAdd.set(winner.id, (pointsToAdd.get(winner.id) || 0) + 100);
        if (runnerUp) pointsToAdd.set(runnerUp.id, (pointsToAdd.get(runnerUp.id) || 0) + 88);
        if (thirdPlace) pointsToAdd.set(thirdPlace.id, (pointsToAdd.get(thirdPlace.id) || 0) + 76);
        if (fourthPlace) pointsToAdd.set(fourthPlace.id, (pointsToAdd.get(fourthPlace.id) || 0) + 64);

        const pointMapping = [ { roundParticipants: 8, points: 48 }, { roundParticipants: 16, points: 32 }, { roundParticipants: 32, points: 16 }, { roundParticipants: 64, points: 10 }];
        const top4Ids = new Set([winner?.id, runnerUp?.id, thirdPlace?.id, fourthPlace?.id].filter(Boolean));
        for (const mapping of pointMapping) {
            const roundIndex = bracket.findIndex(r => r.length * 2 === mapping.roundParticipants);
            if (roundIndex !== -1) {
                bracket[roundIndex].forEach(match => {
                    const loser = match.winner?.id === match.participant1?.id ? match.participant2 : match.participant1;
                    if (loser && !top4Ids.has(loser.id)) pointsToAdd.set(loser.id, (pointsToAdd.get(loser.id) || 0) + mapping.points);
                });
            }
        }

        const newStandings = standings.map(standing => ({
            ...standing,
            pointsPerCompetition: [...standing.pointsPerCompetition, pointsToAdd.get(standing.id) || 0],
        }));
        newStandings.sort((a, b) => b.pointsPerCompetition.reduce((s, p) => s + p, 0) - a.pointsPerCompetition.reduce((s, p) => s + p, 0));
        
        return {
          ...prev, 
          standings: newStandings, 
          competitionsHeld: prev.competitionsHeld + 1, 
          phase: AppPhase.CHAMPIONSHIP_VIEW
        };
    });
  }, []);

  const handleResetChampionship = useCallback(() => {
    setAppState(getInitialState());
  }, []);
  
  const handleSetTotalCompetitions = useCallback((count: number) => {
    setAppState(prev => ({...prev, totalCompetitions: count}));
  }, []);

  const handleEnableRegistration = useCallback(() => {
    const newSessionId = `dmec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    setRegistrationSessionId(newSessionId);
  }, []);

  if (sessionParam) {
    return <RegistrationPage sessionId={sessionParam} />;
  }

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
                standings={standings}
                setStandings={setStandings}
                onStartCompetition={handleStartCompetition}
                totalCompetitions={totalCompetitions}
                setTotalCompetitions={handleSetTotalCompetitions}
                competitionsHeld={competitionsHeld}
                onResetChampionship={handleResetChampionship}
                registrationSessionId={registrationSessionId}
                onEnableRegistration={handleEnableRegistration}
            />
        )}
        {phase === AppPhase.QUALIFICATION && (
          <QualificationView 
            participants={competitionParticipants} 
            setParticipants={setCompetitionParticipants}
            onStartBracket={handleStartBracket}
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