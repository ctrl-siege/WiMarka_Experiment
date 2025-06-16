from database import SessionLocal, create_tables, User, Sentence
from auth import get_password_hash

def init_database():
    create_tables()
    db = SessionLocal()
    
    # Create admin user
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin_user:
        admin_user = User(
            email="admin@example.com",
            username="admin",
            first_name="Admin",
            last_name="User",
            hashed_password=get_password_hash("admin123"),
            is_admin=True,
            guidelines_seen=True,  # Admin has seen guidelines by default
            preferred_language="en"  # Default language for admin
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created: admin@example.com / admin123")
    
    # Add sample sentences
    sample_sentences = [
        {
            "source_text": "The cat sat on the mat.",
            "machine_translation": "Le chat s'est assis sur le tapis.",
            "source_language": "en",
            "target_language": "fr",
            "domain": "general"
        },
        {
            "source_text": "I need to go to the hospital urgently.",
            "machine_translation": "Je dois aller à l'hôpital d'urgence.",
            "source_language": "en",
            "target_language": "fr",
            "domain": "medical"
        },
        {
            "source_text": "The contract must be signed by both parties.",
            "machine_translation": "Le contrat doit être signé par les deux parties.",
            "source_language": "en",
            "target_language": "fr",
            "domain": "legal"
        },
        {
            "source_text": "Please restart your computer to complete the installation.",
            "machine_translation": "Veuillez redémarrer votre ordinateur pour terminer l'installation.",
            "source_language": "en",
            "target_language": "fr",
            "domain": "technical"
        },
        {
            "source_text": "The weather is beautiful today.",
            "machine_translation": "Le temps est beau aujourd'hui.",
            "source_language": "en",
            "target_language": "fr",
            "domain": "general"
        },
        {
            "source_text": "Good morning! How are you today?",
            "machine_translation": "Magandang umaga! Kumusta ka ngayong araw?",
            "source_language": "en",
            "target_language": "tagalog",
            "domain": "general"
        },
        {
            "source_text": "Please help me carry this heavy bag.",
            "machine_translation": "Pakitulong sa akin na buhatin ang mabigat na bag na ito.",
            "source_language": "en",
            "target_language": "tagalog",
            "domain": "general"
        },
        {
            "source_text": "Where is the nearest hospital?",
            "machine_translation": "Asa man ang pinaka-duol nga ospital?",
            "source_language": "en",
            "target_language": "cebuano",
            "domain": "medical"
        },
        {
            "source_text": "Thank you very much for your help.",
            "machine_translation": "Salamat kaayo sa imong tabang.",
            "source_language": "en",
            "target_language": "cebuano",
            "domain": "general"
        },
        {
            "source_text": "What time does the store open?",
            "machine_translation": "Ania nga oras ti panaglukat ti tienda?",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "general"
        },
        {
            "source_text": "I need to buy some food for dinner.",
            "machine_translation": "Kinahanglan ko nga mamakal sang pagkaon para sa panihapon.",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "general"
        },
        {
            "source_text": "The weather is very hot today.",
            "machine_translation": "Maaninit na maray an panahon ngonyan.",
            "source_language": "en",
            "target_language": "bicolano",
            "domain": "general"
        },
        {
            "source_text": "Can you speak English?",
            "machine_translation": "Makakayani ka ba nga magsulti hin Iningles?",
            "source_language": "en",
            "target_language": "waray",
            "domain": "general"
        },
        {
            "source_text": "How much does this cost?",
            "machine_translation": "Magkanu ya ini?",
            "source_language": "en",
            "target_language": "pampangan",
            "domain": "general"
        },
        {
            "source_text": "Please wait for me here.",
            "machine_translation": "Pakiayat ak diad toy lugar.",
            "source_language": "en",
            "target_language": "pangasinan",
            "domain": "general"
        }
    ]

    # Check if sentences already exist
    existing_sentences = db.query(Sentence).all()
    if not existing_sentences:
        for sentence_data in sample_sentences:
            sentence = Sentence(**sentence_data)
            db.add(sentence)
        db.commit()
        print(f"Added {len(sample_sentences)} sample sentences")
    
    db.close()
    print("Database initialization completed!")

if __name__ == "__main__":
    init_database()