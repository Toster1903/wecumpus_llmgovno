# backend/app/seed_data.py
"""
Mock data seed script for Wecampus demo.
Run: cd backend && python -m app.seed_data

Idempotent: skips seeding if users count > 5.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.event import Event
from app.models.market_item import MarketItem
from app.models.post import Post
from app.models.profile import Profile
from app.models.ride import Ride
from app.models.user import User


def now_plus(days: int = 0, hours: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days, hours=hours)


USERS_DATA = [
    {"email": "alexey.petrov@sirius.ru", "full_name": "Алексей Петров", "age": 20,
     "bio": "Люблю писать код и слушать джаз по ночам. Ищу соседа с такими же привычками.",
     "interests": ["python", "джаз", "программирование", "linux"]},
    {"email": "marina.ivanova@sirius.ru", "full_name": "Марина Иванова", "age": 19,
     "bio": "Дизайнер по призванию, кофеман по необходимости. Работаю в Figma больше, чем сплю.",
     "interests": ["дизайн", "figma", "кофе", "типографика"]},
    {"email": "dmitry.sokolov@sirius.ru", "full_name": "Дмитрий Соколов", "age": 22,
     "bio": "ML-инженер и любитель скалолазания. По утрам бегаю, по вечерам дебажу нейросети.",
     "interests": ["машинное обучение", "скалолазание", "бег", "python"]},
    {"email": "anna.kuznetsova@sirius.ru", "full_name": "Анна Кузнецова", "age": 21,
     "bio": "Биолог, увлечённая генетикой и фотографией. На выходных хожу в горы.",
     "interests": ["биология", "генетика", "фотография", "горы", "походы"]},
    {"email": "pavel.morozov@sirius.ru", "full_name": "Павел Морозов", "age": 23,
     "bio": "Геймер и разработчик игр на Unity. Ищу команду для геймджема.",
     "interests": ["геймдев", "unity", "gaming", "аниме"]},
    {"email": "ekaterina.volkov@sirius.ru", "full_name": "Екатерина Волкова", "age": 20,
     "bio": "Занимаюсь йогой каждое утро. Веганское питание и осознанность — мой образ жизни.",
     "interests": ["йога", "веганство", "медитация", "ЗОЖ"]},
    {"email": "nikita.kozlov@sirius.ru", "full_name": "Никита Козлов", "age": 21,
     "bio": "Играю на гитаре и пишу музыку. Хочу создать группу здесь в Сириусе.",
     "interests": ["гитара", "рок", "музыка", "акустика"]},
    {"email": "sofia.novikova@sirius.ru", "full_name": "София Новикова", "age": 19,
     "bio": "Математик и шахматист. Решаю олимпиадные задачи для удовольствия.",
     "interests": ["математика", "шахматы", "алгоритмы", "программирование"]},
    {"email": "artem.popov@sirius.ru", "full_name": "Артём Попов", "age": 22,
     "bio": "Киберспортсмен и стример. По ночам играю в CS2, по утрам — лекции.",
     "interests": ["киберспорт", "cs2", "стриминг", "gaming"]},
    {"email": "yulia.lebedev@sirius.ru", "full_name": "Юлия Лебедева", "age": 20,
     "bio": "Художница и иллюстратор. Рисую скетчи в свободное время.",
     "interests": ["рисование", "иллюстрация", "скетчинг", "дизайн"]},
    {"email": "igor.semyonov@sirius.ru", "full_name": "Игорь Семёнов", "age": 23,
     "bio": "Занимаюсь робототехникой и электроникой. Паяю плату — мой способ расслабиться.",
     "interests": ["робототехника", "электроника", "arduino", "python"]},
    {"email": "oksana.fedorova@sirius.ru", "full_name": "Оксана Фёдорова", "age": 21,
     "bio": "Люблю читать фантастику и ходить на кино. Киноклуб — моё второе дом.",
     "interests": ["кино", "книги", "фантастика", "киноклуб"]},
    {"email": "maxim.michailov@sirius.ru", "full_name": "Максим Михайлов", "age": 20,
     "bio": "Пловец-спортсмен и студент физфака. Море — моя стихия.",
     "interests": ["плавание", "физика", "спорт", "море"]},
    {"email": "alina.andreeva@sirius.ru", "full_name": "Алина Андреева", "age": 19,
     "bio": "Изучаю нейробиологию и практикую майндфулнес. Люблю дискуссии о сознании.",
     "interests": ["нейробиология", "медитация", "философия", "наука"]},
    {"email": "sergei.alekseev@sirius.ru", "full_name": "Сергей Алексеев", "age": 22,
     "bio": "Предприниматель и стартапер. Строю продукты, которые меняют жизнь.",
     "interests": ["стартапы", "продуктовый дизайн", "python", "бизнес"]},
    {"email": "daria.makarova@sirius.ru", "full_name": "Дарья Макарова", "age": 20,
     "bio": "Журналист и блогер. Пишу о науке простым языком.",
     "interests": ["журналистика", "наука", "писательство", "медиа"]},
    {"email": "roman.kovalev@sirius.ru", "full_name": "Роман Ковалёв", "age": 21,
     "bio": "Физик-теоретик, фанат Фейнмана. По выходным играю в настолки.",
     "interests": ["физика", "настолки", "математика", "шахматы"]},
    {"email": "tatyana.gorbachiova@sirius.ru", "full_name": "Татьяна Горбачёва", "age": 19,
     "bio": "Химик и любитель кулинарии. Молекулярная гастрономия — моя страсть.",
     "interests": ["химия", "кулинария", "наука", "молекулярная гастрономия"]},
    {"email": "kirill.sidorov@sirius.ru", "full_name": "Кирилл Сидоров", "age": 23,
     "bio": "DevOps и опен-сорс контрибьютор. Поддерживаю несколько проектов на GitHub.",
     "interests": ["devops", "linux", "open source", "программирование"]},
    {"email": "vera.kozlova@sirius.ru", "full_name": "Вера Козлова", "age": 20,
     "bio": "Танцую contemporary и джаз-фанк. Ищу партнёра для дуэта.",
     "interests": ["танцы", "contemporary", "джаз", "хореография"]},
]

EVENTS_DATA = [
    {"title": "Хакатон по AI: создай своего бота", "description": "48-часовой марафон разработки AI-проектов. Призовой фонд — 100 000 рублей.", "location": "Корпус А, Зал 1", "tags": ["python", "машинное обучение", "программирование", "геймдев"], "days": 3},
    {"title": "Концерт студенческих групп", "description": "Выступают 5 групп из общежития. Живой звук, бесплатный вход.", "location": "Культурный центр", "tags": ["музыка", "рок", "гитара", "джаз"], "days": 5},
    {"title": "Утренняя йога на берегу", "description": "Открытое занятие для всех уровней. Коврик свой или берём у нас.", "location": "Пляж кампуса", "tags": ["йога", "ЗОЖ", "медитация", "спорт"], "days": 2},
    {"title": "Кино-клуб: Интерстеллар", "description": "Смотрим и обсуждаем 'Интерстеллар'. Разбираем физику фильма вместе с учёными.", "location": "Лекционный зал Б", "tags": ["кино", "физика", "наука", "киноклуб"], "days": 4},
    {"title": "Мастер-класс по акварели", "description": "Рисуем морские пейзажи. Материалы предоставляются. Места ограничены.", "location": "Арт-студия", "tags": ["рисование", "иллюстрация", "скетчинг", "дизайн"], "days": 6},
    {"title": "Турнир по шахматам", "description": "Швейцарская система, 7 туров. Приходите с зачёткой для регистрации.", "location": "Клубная комната", "tags": ["шахматы", "математика", "настолки"], "days": 7},
    {"title": "Лекция: Нейронные сети с нуля", "description": "Объясняем backprop на пальцах. Нужны базовые знания Python.", "location": "Аудитория 301", "tags": ["машинное обучение", "python", "программирование"], "days": 8},
    {"title": "Геймджем: сделай игру за 48 часов", "description": "Тема объявляется в пятницу вечером. Команды 1–4 человека.", "location": "Коворкинг кампуса", "tags": ["геймдев", "unity", "gaming", "программирование"], "days": 10},
    {"title": "Пробежка по набережной", "description": "10 км по Олимпийскому парку. Темп 5:30/км, все уровни.", "location": "Стартовая точка: Арка кампуса", "tags": ["бег", "спорт", "ЗОЖ"], "days": 1},
    {"title": "Вечер настольных игр", "description": "Кодenames, Каркассон, Манчкин — приносите свои игры тоже.", "location": "Общий холл, 3 этаж", "tags": ["настолки", "аниме", "gaming"], "days": 3},
    {"title": "Воркшоп по Figma для начинающих", "description": "Учимся прототипировать интерфейсы. Нужен ноутбук.", "location": "Медиалаб", "tags": ["дизайн", "figma", "продуктовый дизайн"], "days": 9},
    {"title": "Открытая дискуссия: этика AI", "description": "Обсуждаем влияние ИИ на общество. Модератор — Сергей Алексеев.", "location": "Круглый стол, Корпус Б", "tags": ["наука", "философия", "машинное обучение", "бизнес"], "days": 11},
    {"title": "Поход в горы: Ахун", "description": "6 км, набор высоты 400м. Уровень: начальный. Собираемся в 8:00 у входа.", "location": "Встреча у ворот кампуса", "tags": ["походы", "горы", "спорт", "фотография"], "days": 14},
    {"title": "Jam-сессия: акустика", "description": "Приходи с инструментом или просто послушать. Джем с 19:00.", "location": "Арт-студия", "tags": ["гитара", "музыка", "акустика", "джаз"], "days": 6},
    {"title": "Соревнования по плаванию", "description": "50м и 100м вольным стилем. Регистрация до 10:00 в день соревнований.", "location": "Бассейн кампуса", "tags": ["плавание", "спорт", "море"], "days": 12},
]

CLUBS_DATA = [
    {"name": "Клуб программистов Сириус", "description": "Еженедельные митапы, code review, совместные проекты. Все языки приветствуются.", "tags": ["программирование", "python", "алгоритмы", "open source"]},
    {"name": "Музыкальная студия", "description": "Репетиционная база, запись треков, совместные выступления. Все жанры.", "tags": ["музыка", "гитара", "рок", "джаз", "акустика"]},
    {"name": "Спортивный клуб Сириус", "description": "Бег, плавание, скалолазание, йога — выбирай активность по душе.", "tags": ["спорт", "бег", "плавание", "скалолазание", "йога", "ЗОЖ"]},
    {"name": "Книжный клуб", "description": "Читаем и обсуждаем книги раз в две недели. Список формируем вместе.", "tags": ["книги", "фантастика", "философия", "наука", "писательство"]},
    {"name": "Клуб настольных игр", "description": "Большая коллекция игр, турниры, введение в новые игры по пятницам.", "tags": ["настолки", "шахматы", "gaming", "аниме"]},
]

MARKET_ITEMS_DATA = [
    {"title": "Учебник по линейной алгебре", "description": "Гильберт, 3-е издание. Состояние хорошее, пометок минимум.", "price": "350.00", "category": "books", "condition": "good"},
    {"title": "Механическая клавиатура Keychron K2", "description": "Switch brown, RGB, б/у 6 месяцев. Коробка есть.", "price": "4500.00", "category": "electronics", "condition": "good"},
    {"title": "Гитара акустическая Yamaha F310", "description": "Отличное состояние, новые струны. Продаю, т.к. перехожу на электро.", "price": "8000.00", "category": "music", "condition": "excellent"},
    {"title": "Конспекты по математическому анализу", "description": "2 семестра, аккуратный почерк, все темы. Электронный вариант + бумага.", "price": "200.00", "category": "books", "condition": "excellent"},
    {"title": "Скетчбук Moleskine A4", "description": "Нераспечатанный, купил лишний.", "price": "600.00", "category": "other", "condition": "new"},
    {"title": "Коврик для йоги", "description": "6мм, нескользящий, цвет голубой. Брала на месяц, продаю.", "price": "1200.00", "category": "sports", "condition": "good"},
    {"title": "Raspberry Pi 4 (4GB)", "description": "Плата + корпус + блок питания. Использовался для проекта, теперь не нужен.", "price": "5500.00", "category": "electronics", "condition": "good"},
    {"title": "Кроссовки Nike Air Max 42р", "description": "Почти новые, надевал 3 раза. Не подошёл размер.", "price": "3200.00", "category": "clothing", "condition": "excellent"},
    {"title": "Учебник по органической химии", "description": "Morrison & Boyd. Английский язык, 6-е издание.", "price": "800.00", "category": "books", "condition": "good"},
    {"title": "Штанга разборная 50кг", "description": "Олимпийский гриф + блины. Отдаю недорого, переезжаю.", "price": "7000.00", "category": "sports", "condition": "good"},
]

RIDES_DATA = [
    {"from_location": "Сириус", "to_location": "Адлер (ж/д вокзал)", "days": 1, "hour": 8, "seats": 3, "comment": "Еду на поезд в 9:15. Место в авто есть."},
    {"from_location": "Адлер", "to_location": "Сириус", "days": 1, "hour": 18, "seats": 2, "comment": "Прилетаю рейсом 17:40, забрать с аэропорта."},
    {"from_location": "Сириус", "to_location": "Сочи центр", "days": 2, "hour": 14, "seats": 4, "comment": "Еду в торговый центр, могу взять попутчиков."},
    {"from_location": "Сочи центр", "to_location": "Сириус", "days": 2, "hour": 20, "seats": 3, "comment": "Возвращаюсь после театра."},
    {"from_location": "Сириус", "to_location": "Краснодар", "days": 5, "hour": 7, "seats": 2, "comment": "Выезжаю рано утром в пятницу. Краснодар, центр."},
    {"from_location": "Краснодар", "to_location": "Сириус", "days": 7, "hour": 19, "seats": 3, "comment": "Возвращаюсь в воскресенье вечером."},
    {"from_location": "Сириус", "to_location": "Роза Хутор", "days": 3, "hour": 9, "seats": 4, "comment": "Едем кататься на сноуборде, есть место."},
    {"from_location": "Сириус", "to_location": "Адлер (аэропорт)", "days": 4, "hour": 5, "seats": 2, "comment": "Ранний рейс, выезд в 05:00."},
]

POSTS_DATA = [
    {"title": "Ищу соседа по комнате", "content": "Привет! Ищу тихого соседа для комнаты 412. Сам программист, ночью не шумлю, только музыка в наушниках. Отзовитесь!", "tags": ["объявление", "сосед"]},
    {"title": "Нашёл кошку у корпуса А", "content": "Рыжая кошка с зелёными глазами, без ошейника. Сейчас у меня в комнате. Если ваша — пишите в ЛС.", "tags": ["животные", "потеряшка"]},
    {"title": "Отдам конспекты по термеху", "content": "Сдал экзамен на 5, конспекты больше не нужны. Всё аккуратно написано. Первому откликнувшемуся отдам бесплатно.", "tags": ["учёба", "конспекты"]},
    {"title": "Кто идёт на хакатон?", "content": "Ищу команду на ближайший хакатон по AI. Сам делаю ML-бэкенд, нужен фронтенд и дизайнер. Опыт — от 1 года.", "tags": ["хакатон", "команда", "программирование"]},
    {"title": "Продаётся велосипед", "content": "Горный велосипед Trek, 26', 21 скорость. Использовался 1 сезон. Цена 15 000 р. Есть шлем и замок в подарок.", "tags": ["продажа", "велосипед", "спорт"]},
    {"title": "Рекомендую книгу: Sapiens", "content": "Дочитал Сапиенсов Харари — это must-read для всех. Обсудим в книжном клубе в среду?", "tags": ["книги", "рекомендация"]},
    {"title": "Запись в йога-группу", "content": "Начинаю вести утренние занятия по йоге 3 раза в неделю, 7:00, пляж. Бесплатно для первых 10 участников.", "tags": ["йога", "ЗОЖ", "запись"]},
    {"title": "Потерял зарядку Macbook", "content": "Потерял зарядку MagSafe 2, 60W. Наклейка с чёрным котом. Оставил в аудитории 205 во вторник. Буду благодарен за возврат.", "tags": ["потеряшка", "macbook"]},
    {"title": "Набираем команду в CS2", "content": "Ищем 2 человек в команду для лиги внутри кампуса. Нужны: снайпер и поддержка. Уровень — Gold Nova+.", "tags": ["киберспорт", "cs2", "команда"]},
    {"title": "Фотографирую для портфолио", "content": "Начинающий фотограф ищет модели для портретной съёмки. Фото отдаю в полное распоряжение. Пишите если интересно!", "tags": ["фотография", "портрет", "бесплатно"]},
]


def seed(db):
    if db.query(User).count() > 5:
        print("Data already seeded, skipping.")
        return

    print("Seeding users and profiles...")
    users = []
    for i, u in enumerate(USERS_DATA):
        user = User(
            email=u["email"],
            hashed_password=get_password_hash("password123"),
            is_verified=True,
            role="student",
        )
        db.add(user)
        db.flush()
        profile = Profile(
            user_id=user.id,
            full_name=u["full_name"],
            age=u["age"],
            bio=u["bio"],
            interests=u["interests"],
            is_looking=True,
        )
        db.add(profile)
        users.append(user)

    db.flush()

    print("Seeding events...")
    for i, e in enumerate(EVENTS_DATA):
        creator = users[i % len(users)]
        event = Event(
            creator_id=creator.id,
            title=e["title"],
            description=e["description"],
            location=e["location"],
            start_time=now_plus(days=e["days"]),
            end_time=now_plus(days=e["days"], hours=2),
            tags=e["tags"],
        )
        db.add(event)

    print("Seeding clubs...")
    for i, c in enumerate(CLUBS_DATA):
        owner = users[i * 3 % len(users)]
        club = Club(
            owner_id=owner.id,
            name=c["name"],
            description=c["description"],
            tags=c["tags"],
        )
        db.add(club)
        db.flush()
        member = ClubMember(club_id=club.id, user_id=owner.id, role="owner")
        db.add(member)

    print("Seeding marketplace...")
    for i, item in enumerate(MARKET_ITEMS_DATA):
        seller = users[(i * 2 + 1) % len(users)]
        market_item = MarketItem(
            seller_id=seller.id,
            title=item["title"],
            description=item["description"],
            price=Decimal(item["price"]),
            category=item["category"],
            condition=item["condition"],
            is_available=True,
        )
        db.add(market_item)

    print("Seeding rides...")
    for i, r in enumerate(RIDES_DATA):
        driver = users[(i * 3) % len(users)]
        ride = Ride(
            driver_id=driver.id,
            from_location=r["from_location"],
            to_location=r["to_location"],
            departure_time=now_plus(days=r["days"], hours=r["hour"]),
            seats_total=r["seats"],
            comment=r["comment"],
        )
        db.add(ride)

    print("Seeding posts...")
    for i, p in enumerate(POSTS_DATA):
        author = users[i % len(users)]
        post = Post(
            author_id=author.id,
            title=p["title"],
            content=p["content"],
            tags=p["tags"],
        )
        db.add(post)

    db.commit()
    print(f"Done! Seeded {len(USERS_DATA)} users, {len(EVENTS_DATA)} events, "
          f"{len(CLUBS_DATA)} clubs, {len(MARKET_ITEMS_DATA)} market items, "
          f"{len(RIDES_DATA)} rides, {len(POSTS_DATA)} posts.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
