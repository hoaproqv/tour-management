from django.db import migrations

def seed_company_manager_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.update_or_create(
        name="company_manager",
        defaults={"description": "Company manager: can manage users for their company and has tour manager permissions."}
    )

def unseed_company_manager_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(name="company_manager").delete()

class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_tenant_address_tenant_phone"),
    ]

    operations = [
        migrations.RunPython(seed_company_manager_role, reverse_code=unseed_company_manager_role)
    ]
