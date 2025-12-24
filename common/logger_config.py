import logging
import logging.config

from tour_management.formatters import VietnamTimeFormatter


def setup_logger():
    """
    Setup and configure logging with Vietnam timezone (UTC+7).
    Returns a configured logger instance.
    This will be used as backup if Django logging is not available.
    """

    # Only configure if not already configured by Django
    if not logging.getLogger().handlers:
        # Configure logging with local timezone
        LOGGING = {
            "version": 1,
            "disable_existing_loggers": False,  # Keep existing loggers
            "formatters": {
                "vietnam_time": {
                    "()": VietnamTimeFormatter,
                    "format": "%(asctime)s - %(filename)s:%(lineno)d - %(name)s - %(levelname)s - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "general_file": {  # Django logs
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": "logs/general.log",
                    "formatter": "vietnam_time",
                    "encoding": "utf-8",
                    "level": "DEBUG",  # Cho phép tất cả levels
                    "maxBytes": 25 * 1024 * 1024,  # 25MB
                    "backupCount": 5,
                },
                "application": {  # App logs
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": "logs/application.log",
                    "formatter": "vietnam_time",
                    "encoding": "utf-8",
                    "level": "DEBUG",  # Cho phép tất cả levels
                    "maxBytes": 25 * 1024 * 1024,  # 25MB
                    "backupCount": 5,
                },
                "system": {  # System logs
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": "logs/system.log",
                    "formatter": "vietnam_time",
                    "encoding": "utf-8",
                    "level": "WARNING",  # Chỉ WARNING và ERROR cho system
                    "maxBytes": 25 * 1024 * 1024,  # 25MB
                    "backupCount": 5,
                },
            },
            "loggers": {
                # Specific loggers for our modules - CHỈ GHI VÀO APPLICATION.LOG
                "tour_management": {
                    "level": "DEBUG",
                    "handlers": ["application"],  # Chỉ application.log
                    "propagate": False,
                },
                "utils": {
                    "level": "DEBUG",
                    "handlers": ["application"],  # Chỉ application.log
                    "propagate": False,
                },
                "common": {
                    "level": "DEBUG",
                    "handlers": ["application"],  # Chỉ application.log
                    "propagate": False,
                },
                "django": {
                    "level": "WARNING",  # Chỉ WARNING và ERROR của Django
                    "handlers": ["general_file"],  # Django vào general.log
                    "propagate": False,
                },
            },
            "root": {
                "level": "WARNING",  # Chỉ WARNING và ERROR cho system
                "handlers": ["system"],  # Chỉ system.log cho framework
            },
        }

        # Apply logging configuration
        logging.config.dictConfig(LOGGING)

    return logging.getLogger(__name__)


def get_logger(name=None):
    """
    Get a logger instance with the specified name.
    If name is None, uses the calling module's name.
    """
    if name is None:
        import inspect

        frame = inspect.currentframe().f_back
        name = frame.f_globals.get("__name__", "unknown")

    return logging.getLogger(name)


# Initialize logging configuration when module is imported
setup_logger()
