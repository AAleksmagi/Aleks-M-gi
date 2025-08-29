import React, { useMemo } from 'react';
import type { Participant, ChampionshipStanding } from '../types';
import { MIN_PARTICIPANTS } from '../constants';

interface QualificationViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  onStartBracket: (participants: Participant[]) => void;
  setChampionshipStandings: React.Dispatch<React.SetStateAction<ChampionshipStanding[]>>;
  competitionsHeld: number;
}

const QualificationView: React.FC<QualificationViewProps> = ({ participants, setParticipants, onStartBracket, setChampionshipStandings, competitionsHeld }) => {

  const updateScore = (id: number, score: string) => {
    const scoreValue = score ? parseInt(score, 10) : null;
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, score: isNaN(scoreValue as number) ? null : scoreValue } : p))
    );
  };
  
  const generateMockParticipants = () => {
    const mockData: {name: string; score: number}[] = [];
     for (let i = 1; i <= 7; i++) {
        mockData.push({
            name: `Osaleja ${i}`,
            score: Math.floor(Math.random() * 100) + 1,
        });
    }

    setChampionshipStandings(prev => {
        const existingNames = new Set(prev.map(p => p.name));
        const newStandings = [...prev];
        const participantsForCompetition = [...participants];
        
        mockData.forEach(mock => {
            if (!existingNames.has(mock.name)) {
                const newStanding = { 
                    id: Date.now() + Math.random(), 
                    name: mock.name, 
                    pointsPerCompetition: Array(competitionsHeld).fill(0) 
                };
                newStandings.push(newStanding);
                
                const existingCompParticipant = participantsForCompetition.find(p => p.name === mock.name);
                if (existingCompParticipant) {
                    existingCompParticipant.score = mock.score;
                } else {
                     participantsForCompetition.push({ ...newStanding, score: mock.score, seed: 0 });
                }

            } else { // if exists, just update score
                const participantToUpdate = participantsForCompetition.find(p => p.name === mock.name);
                if (participantToUpdate) {
                    participantToUpdate.score = mock.score;
                }
            }
        });
        
        setParticipants(participantsForCompetition);
        return newStandings;
    });
  };

  const qualifiedCount = useMemo(() => {
    return participants.filter(p => p.score !== null && p.score > 0).length;
  }, [participants]);

  const canStart = qualifiedCount >= MIN_PARTICIPANTS;

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-blue-300">Kvalifikatsioon</h2>
        <button
          onClick={generateMockParticipants}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 whitespace-nowrap"
          title="Genereerib testimiseks 7 osalejat ja lisab nad vajadusel sarja"
        >
          Genereeri testandmed
        </button>
      </div>
      
      <p className="mb-6 text-gray-400">Sisesta selle võistluse kvalifikatsiooni tulemused. Osalejate nimekirja saab muuta edetabeli vaates.</p>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {participants.map((p) => {
          const isMissingScore = p.score === null;
          return (
            <div key={p.id} className={`flex items-center gap-4 p-3 rounded-md transition-colors duration-300 ${isMissingScore ? 'bg-red-900/50' : 'bg-gray-700'}`}>
              <span className="flex-grow font-semibold text-lg">{p.name}</span>
              <input
                type="number"
                placeholder="Tulemus"
                value={p.score === null ? '' : p.score}
                onChange={(e) => updateScore(p.id, e.target.value)}
                className="w-28 bg-gray-600 text-white placeholder-gray-400 border border-gray-500 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="mb-4 text-lg">
          <span className={`font-bold ${canStart ? 'text-green-400' : 'text-yellow-400'}`}>{qualifiedCount}</span> osalejal on tulemus suurem kui 0.
        </p>
        {!canStart && (
          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-md mb-4 text-left">
            <p className="font-bold">Tegevus on vajalik</p>
            <p className="text-sm">
                Tabeli saab luua {MIN_PARTICIPANTS} või enama osalejaga.
                Jätkamiseks sisesta tulemus, mis on suurem kui 0, vähemalt {MIN_PARTICIPANTS} osalejale.
            </p>
          </div>
        )}
        <button
          onClick={() => onStartBracket(participants)}
          disabled={!canStart}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-xl transition duration-300 shadow-lg"
        >
          Genereeri tabel
        </button>
      </div>
    </div>
  );
};

export default QualificationView;