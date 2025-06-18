from database import SessionLocal, create_tables, User, Sentence, UserLanguage
from auth import get_password_hash

def init_database():
    create_tables()
    db = SessionLocal()
    
    # Create sample users
    sample_users = [
        {
            "email": "admin@example.com",
            "username": "admin",
            "first_name": "Admin",
            "last_name": "User",
            "password": "admin123",
            "is_admin": True,
            "is_evaluator": False,
            "guidelines_seen": True,
            "preferred_language": "en",
            "languages": ["en"]
        },
        {
            "email": "annotator@example.com",
            "username": "cebuano_annotator",
            "first_name": "Maria",
            "last_name": "Santos",
            "password": "annotator123",
            "is_admin": False,
            "is_evaluator": False,
            "guidelines_seen": True,
            "preferred_language": "cebuano",
            "languages": ["cebuano", "en"]
        },
        {
            "email": "evaluator@example.com",
            "username": "evaluator",
            "first_name": "Juan",
            "last_name": "Dela Cruz",
            "password": "evaluator123",
            "is_admin": False,
            "is_evaluator": True,
            "guidelines_seen": True,
            "preferred_language": "en",
            "languages": ["en", "cebuano", "tagalog"]
        }
    ]
    
    for user_data in sample_users:
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            # Create user
            user = User(
                email=user_data["email"],
                username=user_data["username"],
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                hashed_password=get_password_hash(user_data["password"]),
                preferred_language=user_data["preferred_language"],
                is_admin=user_data["is_admin"],
                is_evaluator=user_data["is_evaluator"],
                guidelines_seen=user_data["guidelines_seen"]
            )
            db.add(user)
            db.flush()  # Flush to get the user ID
            
            # Add user languages
            for language in user_data["languages"]:
                user_language = UserLanguage(
                    user_id=user.id,
                    language=language
                )
                db.add(user_language)
            
            db.commit()
            role_description = []
            if user_data["is_admin"]:
                role_description.append("Admin")
            if user_data["is_evaluator"]:
                role_description.append("Evaluator")
            if not role_description:
                role_description.append("Annotator")
            
            role_str = " & ".join(role_description)
            print(f"{role_str} user created: {user_data['email']} / {user_data['password']}")
    
    # Add sample sentences
    sample_sentences = [
        # Cebuano sentences
        {
            "source_text": "Good morning! How are you today?",
            "machine_translation": "Maayong buntag! Kumusta ka karon?",
            "source_language": "en",
            "target_language": "cebuano",
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
            "source_text": "I need to buy some food for dinner.",
            "machine_translation": "Kinahanglan nako nga mopalit ug pagkaon para sa panihapon.",
            "source_language": "en",
            "target_language": "cebuano",
            "domain": "general"
        },
        {
            "source_text": "Please help me with this homework.",
            "machine_translation": "Palihog tabanga ko niining homework.",
            "source_language": "en",
            "target_language": "cebuano",
            "domain": "education"
        },
        
        # Hiligaynon sentences
        {
            "source_text": "What time does the store open?",
            "machine_translation": "Ano nga oras magbukas ang tindahan?",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "general"
        },
        {
            "source_text": "The weather is very hot today.",
            "machine_translation": "Mainit gid ang panahon subong.",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "general"
        },
        {
            "source_text": "I am going to the market.",
            "machine_translation": "Malapit ako sa merkado.",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "general"
        },
        {
            "source_text": "Please call the doctor immediately.",
            "machine_translation": "Palihog tawga ang doktor sang madali.",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "medical"
        },
        {
            "source_text": "The contract needs to be reviewed.",
            "machine_translation": "Ang kontrata kinahanglan nga rebisahon.",
            "source_language": "en",
            "target_language": "hiligaynon",
            "domain": "legal"
        },
        
        # Ilocano sentences
        {
            "source_text": "How much does this cost?",
            "machine_translation": "Mano ti gatad daytoy?",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "general"
        },
        {
            "source_text": "Please wait for me here.",
            "machine_translation": "Pangngaasi nga aguray kaniak ditoy.",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "general"
        },
        {
            "source_text": "The computer is not working properly.",
            "machine_translation": "Saan nga umno ti panagandar ti kompyuter.",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "technical"
        },
        {
            "source_text": "I need to see a lawyer.",
            "machine_translation": "Kasapulak a makita ti abogado.",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "legal"
        },
        {
            "source_text": "The medicine should be taken after meals.",
            "machine_translation": "Ti agas ket rumbeng nga ininom kalpasan ti panangan.",
            "source_language": "en",
            "target_language": "ilocano",
            "domain": "medical"
        },
        
        # Tagalog sentences
        {
            "source_text": "Good evening! Welcome to our restaurant.",
            "machine_translation": "Magandang gabi! Maligayang pagdating sa aming restaurant.",
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
            "source_text": "The patient needs immediate medical attention.",
            "machine_translation": "Ang pasyente ay nangangailangan ng agarang medical attention.",
            "source_language": "en",
            "target_language": "tagalog",
            "domain": "medical"
        },
        {
            "source_text": "Please restart your computer to complete the installation.",
            "machine_translation": "Pakirestart ang inyong computer para makumpleto ang installation.",
            "source_language": "en",
            "target_language": "tagalog",
            "domain": "technical"
        },
        {
            "source_text": "All documents must be signed before submission.",
            "machine_translation": "Lahat ng mga dokumento ay dapat na mapirmahan bago isumite.",
            "source_language": "en",
            "target_language": "tagalog",
            "domain": "legal"
        },
        
        # Waray sentences
        {
            "source_text": "Can you speak English?",
            "machine_translation": "Makakayani ka ba nga magsulti hin Iningles?",
            "source_language": "en",
            "target_language": "waray",
            "domain": "general"
        },
        {
            "source_text": "Where is the bathroom?",
            "machine_translation": "Diin an banyo?",
            "source_language": "en",
            "target_language": "waray",
            "domain": "general"
        },
        {
            "source_text": "The teacher is explaining the lesson.",
            "machine_translation": "An maestra nagpapaliwanag han leksyon.",
            "source_language": "en",
            "target_language": "waray",
            "domain": "education"
        },
        {
            "source_text": "Take this medicine three times a day.",
            "machine_translation": "Inom-a ini nga bulong tulo ka beses han adlaw.",
            "source_language": "en",
            "target_language": "waray",
            "domain": "medical"
        },
        {
            "source_text": "The network connection is unstable.",
            "machine_translation": "An network connection diri estable.",
            "source_language": "en",
            "target_language": "waray",
            "domain": "technical"
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