# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('fleet', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='bus',
            name='tenant',
            field=models.ForeignKey(blank=True, help_text='Tenant that owns this bus. Null for shared/global buses (legacy).', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='buses', to='accounts.tenant'),
        ),
    ]
