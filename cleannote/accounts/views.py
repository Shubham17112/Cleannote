import razorpay
from django.conf import settings
from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .models import UserProfile, SubscriptionTier  # Adjust imports based on your project structure

def login_view(request):
    """Redirect to Google login or show login page"""
    if request.user.is_authenticated:
        
        # Check if user has a subscription
        try:
            profile = request.user.profile
            if profile.subscription:
                return redirect('dashboard:dashboard')
            else:
                return redirect('accounts:subscription')
        except UserProfile.DoesNotExist:
            return redirect('accounts:subscription')
    
    return render(request, 'accounts/login.html')

@login_required
def subscription_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        tier_id = request.POST.get('subscription_tier')
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)

            

            if tier.is_free:
                if profile.subscription and profile.subscription.is_free:
                    messages.error(request, "You've already used the free plan.")
                    return redirect('accounts:subscription')
                profile.subscription = tier
                profile.update_tokens()
                profile.save()
                messages.success(request, f"You're subscribed to the free {tier.name} plan!")
                return redirect('dashboard:dashboard')

            # Handle paid tier
            order = initiate_payment(request.user, tier)
            return render(request, 'accounts/subscription.html', {
                'subscription_tiers': SubscriptionTier.objects.all(),
                'profile': profile,
                'order': order,
                'razorpay_key_id': settings.RAZORPAY_KEY_ID
            })
        except SubscriptionTier.DoesNotExist:
            messages.error(request, "Invalid subscription tier selected.")

    subscription_tiers = SubscriptionTier.objects.all()
    return render(request, 'accounts/subscription.html', {
        'subscription_tiers': subscription_tiers,
        'profile': profile
    })
    
    
def initiate_payment(user, tier):
    """
    Initiates a Razorpay payment order for the given user and subscription tier.
    Returns the order details to be used in the frontend.
    """
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    
    # Convert amount to paise (Razorpay expects amount in smallest currency unit)
    amount = int(tier.price * 100)  # Assuming tier.price is in rupees
    data = {
        'amount': amount,
        'currency': 'INR',
        'receipt': f'order_{user.id}_{tier.id}',
        'notes': {
            'user_id': user.id,
            'subscription_tier_id': tier.id,
        }
    }
    
    try:
        order = client.order.create(data=data)
        return order
    except Exception as e:
        # Log the error for debugging
        print(f"Razorpay error: {str(e)}")
        raise Exception("Failed to initiate payment")
    
    
from django.views.decorators.csrf import csrf_exempt
@csrf_exempt
@login_required
def payment_success(request):
    print("Payment success view triggered")
    
    # Extract Razorpay parameters from GET or POST
    if request.method == 'POST':
        params_dict = {
            'razorpay_payment_id': request.POST.get('razorpay_payment_id'),
            'razorpay_order_id': request.POST.get('razorpay_order_id'),
            'razorpay_signature': request.POST.get('razorpay_signature')
        }
    else:  # GET request
        params_dict = {
            'razorpay_payment_id': request.GET.get('razorpay_payment_id'),
            'razorpay_order_id': request.GET.get('razorpay_order_id'),
            'razorpay_signature': request.GET.get('razorpay_signature')
        }
    
    print(f"Parameters received: {params_dict}")
    
    # Check if all required parameters are present
    if not all(params_dict.values()):
        print("Missing Razorpay parameters")
        messages.error(request, "Payment verification failed: Missing parameters.")
        return redirect('accounts:subscription')
    
    try:
        # Initialize Razorpay client
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        # Verify the payment signature
        client.utility.verify_payment_signature(params_dict)
        
        # Fetch order details to get subscription tier
        order = client.order.fetch(params_dict['razorpay_order_id'])
        tier_id = order['notes']['subscription_tier_id']
        tier = SubscriptionTier.objects.get(id=tier_id)
        
        # Update user profile
        profile = UserProfile.objects.get(user=request.user)
        profile.subscription = tier
        profile.update_tokens()
        profile.save()
        print(f"User profile updated: {profile.tokens_remaining} tokens for {tier.name}")
        messages.success(request, f"Successfully subscribed to {tier.name}!")
        return redirect('dashboard:dashboard')
    
    except razorpay.errors.SignatureVerificationError as e:
        print(f"Signature verification failed: {str(e)}")
        messages.error(request, "Payment verification failed: Invalid signature.")
        return redirect('accounts:subscription')
    except Exception as e:
        print(f"Error in payment success: {str(e)}")
        messages.error(request, f"Payment verification failed: {str(e)}")
        return redirect('accounts:subscription')