from django.apps import AppConfig


class PassengersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "passengers"

    def ready(self):
        import passengers.signals  # noqa: F401 # pylint: disable=unused-import
