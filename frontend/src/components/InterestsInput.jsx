import { useId, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';

const BASE_INTERESTS = [
  'coding',
  'python',
  'javascript',
  'gaming',
  'music',
  'rock',
  'movies',
  'reading',
  'chess',
  'coffee',
  'fitness',
  'travel',
  'design',
  'photography',
  'art',
  'anime',
  'football',
  'running',
  'cooking',
  'startup',
];

const normalizeInterest = (value) => value.trim().replace(/\s+/g, ' ');
const sameInterest = (left, right) => left.toLowerCase() === right.toLowerCase();

const InterestsInput = ({
  interests = [],
  onChange,
  label = 'Интересы',
  placeholder = 'Например, chess',
  helperText = 'Добавляйте интересы через Enter или кнопку +',
}) => {
  const [draft, setDraft] = useState('');
  const dataListId = useId();

  const availableSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();

    return BASE_INTERESTS.filter((option) => {
      const alreadySelected = interests.some((item) => sameInterest(item, option));
      if (alreadySelected) {
        return false;
      }

      if (!query) {
        return true;
      }

      return option.toLowerCase().includes(query);
    }).slice(0, 8);
  }, [draft, interests]);

  const addInterest = (rawValue) => {
    const nextValue = normalizeInterest(rawValue);

    if (!nextValue) {
      return;
    }

    const exists = interests.some((item) => sameInterest(item, nextValue));
    if (exists) {
      setDraft('');
      return;
    }

    onChange([...interests, nextValue]);
    setDraft('');
  };

  const removeInterest = (valueToRemove) => {
    onChange(interests.filter((item) => !sameInterest(item, valueToRemove)));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor={`interest-input-${dataListId}`}>
        {label}
      </label>

      <div className="relative">
        <input
          id={`interest-input-${dataListId}`}
          type="text"
          value={draft}
          list={dataListId}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addInterest(draft);
            }
          }}
          className="w-full rounded-xl backdrop-blur-md bg-white/60 border border-slate-200/70 px-4 py-2.5 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder={placeholder}
        />

        <button
          type="button"
          onClick={() => addInterest(draft)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white p-2 transition"
          aria-label="Добавить интерес"
        >
          <Plus size={16} />
        </button>
      </div>

      <datalist id={dataListId}>
        {availableSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <p className="text-xs text-slate-500 mt-1">{helperText}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {interests.map((interest) => (
          <span
            key={interest}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-300/50 px-3 py-1 text-xs text-emerald-700"
          >
            {interest}
            <button
              type="button"
              onClick={() => removeInterest(interest)}
              className="text-emerald-700/80 hover:text-emerald-900"
              aria-label={`Удалить интерес ${interest}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {!!availableSuggestions.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableSuggestions.slice(0, 5).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => addInterest(option)}
              className="text-xs rounded-full bg-white/70 border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition"
            >
              + {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterestsInput;
