import json

# A standard list of English stop words
STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves",
    "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about",
    "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up",
    "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
    "should", "now", "could", "would", "might", "must", "may", "also", "ever", "every", "everyone", "everything",
    "everywhere", "many", "much", "well", "yet", "re", "ve", "ll", "d", "m"
}

def process_oxford_list(input_path, output_path):
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Use a dictionary to keep words unique
        unique_words = {}
        
        for key in data:
            item = data[key]
            word = item.get('word', '').lower()
            cefr = item.get('cefr', '').upper()
            
            # 1. Exclude stop words and check if word exists
            if word and word not in STOP_WORDS and word not in unique_words:
                unique_words[word] = cefr

        # Convert back to list of objects
        filtered_list = [
            {"word": w, "cefr": c} for w, c in unique_words.items()
        ]
        
        # Save to new JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(filtered_list, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully processed {len(filtered_list)} words.")
        print(f"Output saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process_oxford_list('oxford_5000.json', 'oxford_5000_filtered.json')
