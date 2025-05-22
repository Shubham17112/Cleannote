from django.db import models
from django.contrib.auth.models import User

class SubscriptionTier(models.Model):
    name = models.CharField(max_length=50)
    token_limit = models.IntegerField()
    description = models.TextField()
    is_free = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=100)
    
    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    subscription = models.ForeignKey(SubscriptionTier, on_delete=models.SET_NULL, null=True)
    tokens_remaining = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.user.username}'s profile"
    
    def update_tokens(self):
        """Reset tokens to the subscription limit"""
        if self.subscription:
            self.tokens_remaining += self.subscription.token_limit
            self.save()
    
    def consume_tokens(self, amount):
        """Consume tokens and return True if successful, False if not enough tokens"""
        if self.tokens_remaining >= amount:
            self.tokens_remaining -= amount
            
            self.save()
            return True
        return False
