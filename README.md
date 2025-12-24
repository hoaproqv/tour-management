# Tour Management Platform

A Django-based foundation for managing tour information with a React frontend scaffold.

## Features

- Core page routing
- RESTful API
- Admin dashboard

## Project Structure

- `core/` - Core application modules
- `tour_management/` - Main Django project settings

## Setup and Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tour-management
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   Copy `.env.example` to `.env` and configure your settings.

4. Run migrations:

```bash
python manage.py migrate
```

5. Collect static files:

```bash
python manage.py collectstatic --noinput
```

6. Start the development server:

```bash
python manage.py runserver 0.0.0.0:8000
```

## Environment Variables

- `THM_DEBUG` - Debug mode
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_HOST` - Database host
- `DB_PORT` - Database port

## Technologies Used

- Django
- Redis
- PostgreSQL
- Bootstrap/CSS
- JavaScript

## License

This project is proprietary software.
