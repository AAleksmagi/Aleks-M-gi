import React from 'react';
import type { BracketData, Match, Participant } from '../types';
import { AppPhase } from '../constants';

// --- Helper Components defined at top-level ---

interface MatchCardProps {
  match: Match;
  onSetWinner: (matchId: number, winner: Participant) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onSetWinner }) => {
  const { participant1, participant2, winner } = match;

  const canSelectWinner = participant1 && participant2 && !winner;

  const handleSelectWinner = (selectedParticipant: Participant) => {
    if (canSelectWinner) {
      onSetWinner(match.id, selectedParticipant);
    }
  };

  const getParticipantClass = (participant: Participant | null, isWinner: boolean) => {
    if (!participant) return 'text-gray-500 italic';
    if (!winner && canSelectWinner) return 'cursor-pointer hover:bg-blue-600';
    if (isWinner) return 'font-bold text-green-300';
    return 'text-gray-500 line-through';
  };
  
  const isP1Winner = winner !== null && winner?.id === participant1?.id;
  const isP2Winner = winner !== null && winner?.id === participant2?.id;

  return (
    <div className="bg-gray-800 rounded-lg shadow-md w-64 h-24 flex flex-col justify-center border border-gray-700">
      <div
        className={`p-2 transition-colors duration-200 rounded-t-lg ${getParticipantClass(participant1, isP1Winner)}`}
        onClick={() => participant1 && handleSelectWinner(participant1)}
      >
        <span className="text-sm text-gray-400 mr-2">{participant1?.seed}</span>
        {participant1?.name || 'Selgumisel'}
      </div>
      <div className="border-t border-gray-600"></div>
      <div
        className={`p-2 transition-colors duration-200 rounded-b-lg ${getParticipantClass(participant2, isP2Winner)}`}
        onClick={() => participant2 && handleSelectWinner(participant2)}
      >
        <span className="text-sm text-gray-400 mr-2">{participant2?.seed}</span>
        {participant2?.name || 'Selgumisel'}
      </div>
    </div>
  );
};


const Connector: React.FC = () => {
  return (
    <div className="w-8 h-full relative" aria-hidden="true">
      {/* Vertical line joining the two parent branches */}
      <div className="absolute top-1/4 right-1/2 w-px h-1/2 bg-gray-600"></div>
      
      {/* Top branch from parent match */}
      <div className="absolute top-1/4 right-1/2 w-1/2 h-px bg-gray-600"></div>

      {/* Bottom branch from parent match */}
      <div className="absolute bottom-1/4 right-1/2 w-1/2 h-px bg-gray-600"></div>

      {/* Line to child match */}
      <div className="absolute top-1/2 right-0 w-1/2 h-px bg-gray-600"></div>
    </div>
  );
};


interface WinnerDisplayProps {
    bracketData: BracketData;
    thirdPlaceMatch: Match | null;
    participants: Participant[];
    onReturnToChampionship: () => void;
}

const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ bracketData, thirdPlaceMatch, participants, onReturnToChampionship }) => {
    const finalMatch = bracketData[bracketData.length - 1]?.[0];
    const winner = finalMatch?.winner;

    const qualificationWinner = participants
        .filter(p => p.score !== null && p.score > 0)
        .sort((a, b) => (b.score as number) - (a.score as number))[0];
    
    if (!winner) return null;

    const runnerUp = finalMatch?.participant1?.id === winner.id ? finalMatch.participant2 : finalMatch?.participant1;
    const thirdPlace = thirdPlaceMatch?.winner;

    return (
        <div className="relative flex flex-col items-center justify-center text-center p-4">
            <div className="relative z-10 w-full">
              <h2 className="text-3xl font-bold text-yellow-400 mb-8 tracking-wider opacity-0 animate-podium-item" style={{ animationDelay: '0s' }}>Võistluse tulemused</h2>
              
              <div className="flex justify-center items-end gap-10 md:gap-16 flex-wrap">
                  {/* Podium */}
                  <div className="flex items-end justify-center gap-4">
                      {runnerUp && (
                          <div className="flex flex-col items-center order-1 sm:order-1 opacity-0 animate-podium-item" style={{ animationDelay: '0.4s' }}>
                              <div className="text-4xl">🥈</div>
                              <div className="font-bold text-xl text-gray-300">{runnerUp.name}</div>
                              <div className="bg-gray-700 w-32 h-24 rounded-t-lg flex items-center justify-center text-2xl font-bold">2. koht</div>
                          </div>
                      )}
                      <div className="flex flex-col items-center order-2 sm:order-2 opacity-0 animate-podium-item" style={{ animationDelay: '0.6s' }}>
                          <div className="text-5xl">🥇</div>
                          <div className="font-bold text-2xl text-yellow-300">{winner.name}</div>
                          <div className="bg-yellow-500 text-gray-900 w-40 h-32 rounded-t-lg flex items-center justify-center text-3xl font-bold">1. koht</div>
                      </div>
                      {thirdPlace && (
                          <div className="flex flex-col items-center order-3 sm:order-3 opacity-0 animate-podium-item" style={{ animationDelay: '0.2s' }}>
                              <div className="text-4xl">🥉</div>
                              <div className="font-bold text-xl" style={{ color: '#CD7F32' }}>{thirdPlace.name}</div>
                              <div className="w-32 h-20 rounded-t-lg flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: '#8C5A2B' }}>3. koht</div>
                          </div>
                      )}
                  </div>
                  
                  {/* Qualification Winner */}
                  {qualificationWinner && (
                    <div className="flex flex-col items-center opacity-0 animate-podium-item" style={{ animationDelay: '0.8s' }}>
                      <div className="text-5xl mb-2">🏆</div>
                      <div className="font-bold text-xl text-yellow-300">{qualificationWinner.name}</div>
                      <div className="text-lg font-semibold text-gray-400 mt-1">Kvalifikatsiooni võitja</div>
                    </div>
                  )}

              </div>
              <button
                  onClick={onReturnToChampionship}
                  className="mt-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300 opacity-0 animate-podium-item"
                  style={{ animationDelay: '1.0s' }}
              >
                  Lõpeta võistlus ja vaata edetabelit
              </button>
            </div>
        </div>
    );
};

// --- Main Bracket Component ---

interface TournamentBracketProps {
  bracketData: BracketData;
  thirdPlaceMatch: Match | null;
  onSetWinner: (matchId: number, winner: Participant) => void;
  phase: AppPhase;
  onReturnToChampionship: () => void;
  participants: Participant[];
  onReturnToQualification: () => void;
  onReturnToChampionshipView: () => void;
}

const getRoundName = (numMatches: number) => {
    if (numMatches === 1) return 'Finaal';
    if (numMatches === 2) return 'Poolfinaalid';
    if (numMatches === 4) return 'Veerandfinaalid';
    if (numMatches >= 8) return `1/${numMatches}-finaalid`;
    return `Voor ${numMatches * 2} osalejaga`;
};


const TournamentBracket: React.FC<TournamentBracketProps> = ({ 
    bracketData, 
    thirdPlaceMatch, 
    onSetWinner, 
    phase, 
    onReturnToChampionship, 
    participants,
    onReturnToQualification,
    onReturnToChampionshipView
}) => {
    if (!bracketData || bracketData.length === 0) {
        return <p>Laen tabelit...</p>;
    }

    if (phase === AppPhase.FINISHED) {
        return (
             <div className="relative p-6 bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <WinnerDisplay 
                    bracketData={bracketData} 
                    thirdPlaceMatch={thirdPlaceMatch} 
                    onReturnToChampionship={onReturnToChampionship}
                    participants={participants}
                />
            </div>
        )
    }

    const finalRound = bracketData[bracketData.length - 1];

    // Card is h-24 (6rem). We'll give it 1rem vertical spacing. Total slot height = 7rem.
    const MATCH_SLOT_HEIGHT_REM = 7;
    const totalBracketHeightRem = (bracketData[0]?.length ?? 0) * MATCH_SLOT_HEIGHT_REM;

    return (
        <>
            <div className="p-4 bg-gray-900/50 rounded-xl overflow-x-auto">
                <div className="flex justify-start items-start">
                    {bracketData.map((round, roundIndex) => {
                        if (roundIndex === bracketData.length - 1) return null; // Skip final round from this loop

                        const matchSlotHeight = MATCH_SLOT_HEIGHT_REM * Math.pow(2, roundIndex);
                        const connectorSlotHeight = matchSlotHeight * 2;

                        return (
                            <React.Fragment key={roundIndex}>
                                {/* Round Column with Header */}
                                <div className="flex flex-col px-2">
                                    <div className="h-10 flex items-end justify-center pb-2">
                                        <h3 className="text-center font-bold text-blue-300">
                                        {getRoundName(round.length)}
                                        </h3>
                                    </div>
                                    {round.map((match) => (
                                        <div key={match.id} style={{ height: `${matchSlotHeight}rem` }} className="flex items-center">
                                            <MatchCard match={match} onSetWinner={onSetWinner} />
                                        </div>
                                    ))}
                                </div>
                                {/* Connectors Column */}
                                <div className="flex flex-col">
                                    {/* Spacer for header */}
                                    <div className="h-10" />
                                    {Array.from({ length: round.length / 2 }).map((_, i) => (
                                        <div key={i} style={{ height: `${connectorSlotHeight}rem` }} className="flex items-center">
                                            <Connector />
                                        </div>
                                    ))}
                                </div>
                            </React.Fragment>
                        );
                    })}

                    {/* Finals Column */}
                    <div className="flex flex-col justify-center items-center px-4" style={{ minHeight: `${totalBracketHeightRem}rem`}}>
                        <div className="h-10 flex items-end justify-center pb-2">
                            <h3 className="text-center font-bold text-yellow-400">Finaalid</h3>
                        </div>
                        {finalRound && finalRound.map((match) => (
                            <MatchCard key={match.id} match={match} onSetWinner={onSetWinner} />
                        ))}
                        
                        {thirdPlaceMatch && (
                            <div className="mt-8">
                                <div className="text-center font-bold mb-4 text-orange-400">3. koha mäng</div>
                                <MatchCard match={thirdPlaceMatch} onSetWinner={onSetWinner} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-8 flex justify-center items-center gap-4 text-sm">
                <button
                onClick={onReturnToQualification}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                Tagasi kvalifikatsiooni
                </button>
                <button
                onClick={onReturnToChampionshipView}
                className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                Katkesta ja mine edetabelisse
                </button>
            </div>
        </>
    );
};

export default TournamentBracket;