from rest_framework import serializers

from transactions.models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "passenger",
            "round_bus",
            "check_in",
            "check_out",
            "created_at",
            "updated_at",
        ]
