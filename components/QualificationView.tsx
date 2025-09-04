import React, { useMemo, useState } from 'react';
import type { Participant } from '../types';
import { MIN_PARTICIPANTS } from '../constants';

interface QualificationViewProps {
  participants: Participant[];
  onStartBracket: (participants: Participant[]) => void;
  sessionId: string | null;
}

const LinkSharer: React.FC<{ label: string, description: string, link: string }> = ({ label, description, link }) => {
    const [copied, setCopied] = useState(false);
    const copyLink = () => {
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="my-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold mb-2 text-blue-300">{label}</h3>
            <p className="text-sm text-gray-400 mb-3">{description}</p>
            <div className="flex gap-2 items-center bg-gray-900 p-2 rounded-md">
                <input
                    type="text"
                    readOnly
                    value={link}
                    className="flex-grow bg-transparent text-gray-300 focus:outline-none"
                    aria-label={label}
                />
                <button
                    onClick={copyLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                >
                    {copied ? 'Kopeeritud!' : 'Kopeeri'}
                </button>
            </div>
        </div>
    );
}

const QualificationView: React.FC<QualificationViewProps> = ({ 
    participants, 
    onStartBracket,
    sessionId,
}) => {
  const submissionLink = sessionId 
      ? `${window.location.origin}${window.location.pathname}?submit-score=${sessionId}`
      : '';

  const qualifiedCount = useMemo(() => {
    return participants.filter(p => p.score !== null && p.score > 0).length;
  }, [participants]);

  const canStart = qualifiedCount >= MIN_PARTICIPANTS;

  const sortedParticipants = useMemo(() => 
    [...participants].sort((a,b) => {
      if (a.score !== null && b.score === null) return -1;
      if (a.score === null && b.score !== null) return 1;
      if (a.score !== null && b.score !== null) return (b.score as number) - (a.score as number);
      return a.name.localeCompare(b.name);
    }),
  [participants]);

  return (
    <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-blue-300">Kvalifikatsioon</h2>
      </div>
      
      <p className="mb-2 text-gray-400">Osalejad saavad nüüd oma tulemused ise sisestada. Jälgi tulemuste laekumist reaalajas.</p>
      
      {submissionLink && (
        <LinkSharer 
            label="Tulemuste sisestamise link"
            description="Jaga seda linki osalejatega, et nad saaksid oma kvalifikatsiooni tulemuse sisestada."
            link={submissionLink}
        />
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mt-6">
        {participants.length === 0 && (
          <p className="text-center text-gray-500 py-8">Võistlusel pole osalejaid.</p>
        )}
        {sortedParticipants.map((p, index) => {
          const hasScore = p.score !== null;
          return (
            <div key={p.id} className={`flex items-center justify-between gap-4 p-3 rounded-md transition-colors duration-300 ${hasScore ? 'bg-gray-700' : 'bg-yellow-900/50'}`}>
              <div className="flex items-center gap-4">
                {hasScore && <span className="font-bold text-lg w-8 text-center">{index + 1}.</span>}
                <span className={`font-semibold text-lg ${!hasScore && 'ml-12'}`}>{p.name}</span>
              </div>
              {hasScore ? (
                <span className="font-bold text-xl text-yellow-400">{p.score}</span>
              ) : (
                <span className="text-sm text-yellow-300 italic">Ootab tulemust...</span>
              )}
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
                Jätkamiseks oota, kuni piisav arv osalejaid on oma tulemuse sisestanud.
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