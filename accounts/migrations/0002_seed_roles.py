from django.db import migrations


ROLE_DEFINITIONS = [
    (
        "admin",
        "System admin with full access.",
    ),
    (
        "tour_manager",
        "Manage tours: can add/update/delete bus, trip, round, passenger.",
    ),
    (
        "fleet_lead",
        "Fleet lead: can edit transactions for assigned bus, check in passengers to own bus, and finalize attendance.",
    ),
    (
        "driver",
        "Driver: can view transactions and schedules (rounds/buses).",
    ),
]


def seed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    for name, description in ROLE_DEFINITIONS:
        Role.objects.update_or_create(name=name, defaults={"description": description})


def unseed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(name__in=[name for name, _ in ROLE_DEFINITIONS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [migrations.RunPython(seed_roles, reverse_code=unseed_roles)]
