import logging
from datetime import datetime, timedelta, timezone


class VietnamTimeFormatter(logging.Formatter):
    """
    Custom formatter to display logs in Vietnam timezone (UTC+7)
    """

    def formatTime(self, record, datefmt=None):
        """
        Convert UTC timestamp to Vietnam time (UTC+7)
        """
        vietnam_tz = timezone(timedelta(hours=7))
        dt = datetime.fromtimestamp(record.created, tz=vietnam_tz)
        if datefmt:
            return dt.strftime(datefmt)

        return dt.strftime("%Y-%m-%d %H:%M:%S")
