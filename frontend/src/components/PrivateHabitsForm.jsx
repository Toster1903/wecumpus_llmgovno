const HABIT_FIELDS = {
  bedtime: '',
  wake_time: '',
  cleanliness: '',
  guests: '',
  noise: '',
  smoking: '',
  pets: '',
  roommate_expectations: '',
};

export const createEmptyHabits = () => ({ ...HABIT_FIELDS });

export const sanitizeHabits = (habits) => {
  const source = habits || {};
  const clean = {};

  Object.keys(HABIT_FIELDS).forEach((key) => {
    const value = typeof source[key] === 'string' ? source[key].trim() : '';
    if (value) {
      clean[key] = value;
    }
  });

  return Object.keys(clean).length ? clean : null;
};

const PrivateHabitsForm = ({
  habits,
  onChange,
  title = 'Приватные бытовые привычки',
  description = 'Эти данные не видят другие пользователи. Они используются только для подбора соседей по комнате.',
}) => {
  const updateField = (field, value) => {
    onChange({
      ...createEmptyHabits(),
      ...(habits || {}),
      [field]: value,
    });
  };

  const values = {
    ...createEmptyHabits(),
    ...(habits || {}),
  };

  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/60 border border-slate-200/70 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm text-slate-700">
          Во сколько ложитесь
          <input
            type="time"
            value={values.bedtime}
            onChange={(event) => updateField('bedtime', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm text-slate-700">
          Во сколько встаете
          <input
            type="time"
            value={values.wake_time}
            onChange={(event) => updateField('wake_time', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="text-sm text-slate-700">
          Уровень аккуратности
          <select
            value={values.cleanliness}
            onChange={(event) => updateField('cleanliness', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Не указано</option>
            <option value="low">Свободный порядок</option>
            <option value="medium">Умеренный порядок</option>
            <option value="high">Люблю чистоту</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Отношение к гостям
          <select
            value={values.guests}
            onChange={(event) => updateField('guests', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Не указано</option>
            <option value="rarely">Редко</option>
            <option value="sometimes">Иногда</option>
            <option value="often">Часто</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Шум
          <select
            value={values.noise}
            onChange={(event) => updateField('noise', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Не указано</option>
            <option value="quiet">Предпочитаю тишину</option>
            <option value="medium">Нормально с умеренным шумом</option>
            <option value="any">Шум не мешает</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Курение
          <select
            value={values.smoking}
            onChange={(event) => updateField('smoking', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Не указано</option>
            <option value="no">Не курю и не люблю дым</option>
            <option value="outside">Нормально, если на улице</option>
            <option value="yes">Курение ок</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 md:col-span-2">
          Отношение к питомцам
          <select
            value={values.pets}
            onChange={(event) => updateField('pets', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Не указано</option>
            <option value="love">Люблю животных</option>
            <option value="neutral">Нейтрально</option>
            <option value="allergy">Нежелательно из-за аллергии</option>
          </select>
        </label>
      </div>

      <label className="text-sm text-slate-700 block">
        Что важно в соседе
        <textarea
          rows="3"
          value={values.roommate_expectations}
          onChange={(event) => updateField('roommate_expectations', event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Например: после 23:00 тишина, делим уборку по очереди"
        />
      </label>
    </div>
  );
};

export default PrivateHabitsForm;
