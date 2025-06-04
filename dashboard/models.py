from django.db import models
from django.contrib.auth.models import User

class AIModel(models.Model):
    name = models.CharField(max_length=100)
    api_key_field = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)
    
    def __str__(self):
        return self.name

class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    youtube_url = models.URLField()
    title = models.CharField(max_length=255)
    content = models.TextField()
    ai_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True)
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    video_id = models.CharField(max_length=11, blank=True, null=True)  # Added field

    
    def __str__(self):
        return self.title

class UserAPIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    ai_model = models.ForeignKey(AIModel, on_delete=models.CASCADE)
    api_key = models.CharField(max_length=255)
    
    class Meta:
        unique_together = ('user', 'ai_model')
    
    def __str__(self):
        return f"{self.user.username}'s {self.ai_model.name} API key"
