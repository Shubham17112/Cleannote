from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import SubscriptionTier, UserProfile

def login_view(request):
    """Redirect to Google login or show login page"""
    if request.user.is_authenticated:
        
        # Check if user has a subscription
        try:
            profile = request.user.profile
            if profile.subscription:
                return redirect('dashboard:index')
            else:
                return redirect('accounts:subscription')
        except UserProfile.DoesNotExist:
            return redirect('accounts:subscription')
    
    return render(request, 'accounts/login.html')

@login_required
def subscription_view(request):
    """Show subscription options and handle selection"""
    # Create user profile if it doesn't exist
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        tier_id = request.POST.get('subscription_tier')
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
            profile.subscription = tier
            profile.update_tokens()
            profile.save()
            messages.success(request, f"You've successfully subscribed to the {tier.name} plan!")
            return redirect('dashboard:index')
        except SubscriptionTier.DoesNotExist:
            messages.error(request, "Invalid subscription tier selected.")
    
    subscription_tiers = SubscriptionTier.objects.all()
    return render(request, 'accounts/subscription.html', {
        'subscription_tiers': subscription_tiers,
        'profile': profile
    })
