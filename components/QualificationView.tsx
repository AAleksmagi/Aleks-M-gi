import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { Participant, ChampionshipStanding } from '../types';
import { MIN_PARTICIPANTS } from '../constants';

interface QualificationViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  onStartBracket: (participants: Participant[]) => void;
  championshipStandings: ChampionshipStanding[];
  setChampionshipStandings: React.Dispatch<React.SetStateAction<ChampionshipStanding[]>>;
  competitionsHeld: number;
}
interface AppState {
  standings: ChampionshipStanding[];
  competitionsHeld: number;
}

const encodeState = (state: AppState): string => {
  try {
    const json = JSON.stringify(state);
    return btoa(json);
  } catch (error) {
    console.error("Failed to encode state:", error);
    return '';
  }
};

const decodeState = (encoded: string): AppState | null => {
  try {
    const json = atob(encoded);
    return JSON.parse(json) as AppState;
  } catch (error) {
    console.error("Failed to decode state:", error);
    return null;
  }
};


const QualificationView: React.FC<QualificationViewProps> = ({ participants, setParticipants, onStartBracket, championshipStandings, setChampionshipStandings, competitionsHeld }) => {
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState('');

  const handleHashChange = useCallback(() => {
      if (window.location.hash.startsWith('#registration/')) {
        const encodedState = window.location.hash.substring(14);
        const decoded = decodeState(encodedState);
        if (decoded && JSON.stringify(decoded.standings) !== JSON.stringify(championshipStandings)) {
           setChampionshipStandings(decoded.standings);
        }
      }
  }, [championshipStandings, setChampionshipStandings]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    // clean up url when navigating away
    return () => {
       window.removeEventListener('hashchange', handleHashChange);
       if(window.location.hash.startsWith('#registration/')){
         window.history.pushState("", document.title, window.location.pathname + window.location.search);
       }
    };
  }, [handleHashChange]);


  const openRegistrationModal = () => {
    const state: AppState = { standings: championshipStandings, competitionsHeld };
    const encodedState = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}#registration/${encodedState}`;
    setRegistrationUrl(url);
    setIsRegistrationModalOpen(true);
  };

  const updateScore = (id: number, score: string) => {
    const scoreValue = score ? parseInt(score, 10) : null;
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, score: isNaN(scoreValue as number) ? null : scoreValue } : p))
    );
  };

  const qualifiedCount = useMemo(() => {
    return participants.filter(p => p.score !== null && p.score > 0).length;
  }, [participants]);

  const canStart = qualifiedCount >= MIN_PARTICIPANTS;

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-blue-300">Kvalifikatsioon</h2>
        <button
          onClick={openRegistrationModal}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 whitespace-nowrap"
          title="Genereerib lingi, mille kaudu saavad osalejad ise registreeruda"
        >
          Ava registreerimine lingiga
        </button>
      </div>
      
      <p className="mb-6 text-gray-400">Sisesta selle võistluse kvalifikatsiooni tulemused. Uusi osalejaid saab sarja lisada edetabeli vaates või jagades registreerimise linki.</p>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {participants.length === 0 && (
          <p className="text-center text-gray-500 py-8">Osalejaid pole veel. Lisa neid edetabeli vaates või ava registreerimine lingiga.</p>
        )}
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

      {isRegistrationModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setIsRegistrationModalOpen(false)}>
          <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-lg w-full text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-yellow-300 mb-4">Jaga linki osalejatega</h3>
            <p className="text-gray-400 mb-6">Osalejad saavad selle lingi või QR-koodi kaudu ennast võistlusele registreerida. Sinu nimekiri uueneb automaatselt.</p>
            
            <div className="bg-gray-900 p-4 rounded-lg mb-4">
              <input 
                type="text" 
                readOnly 
                value={registrationUrl}
                className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded-md px-3 py-2 text-sm"
                onFocus={e => e.target.select()}
              />
              <button 
                onClick={() => navigator.clipboard.writeText(registrationUrl)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 text-sm rounded-md transition duration-300"
              >
                Kopeeri link
              </button>
            </div>
            
            <div className="flex justify-center mb-6">
               <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registrationUrl)}&bgcolor=1F2937&color=FFFFFF&qzone=1`}
                  alt="Registration QR Code"
                  className="rounded-lg border-4 border-gray-700"
                />
            </div>
            
            <button
              onClick={() => setIsRegistrationModalOpen(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md transition duration-300"
            >
              Sulge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualificationView;
