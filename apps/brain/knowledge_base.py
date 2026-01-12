import os
import logging
import sys
from langchain_community.document_loaders import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import CharacterTextSplitter

# Define paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Ensure absolute path to the knowledge file
KNOWLEDGE_FILE = os.path.join(CURRENT_DIR, "knowledge", "hotel_manual.txt")
CHROMA_DB_DIR = os.path.join(CURRENT_DIR, "chroma_db")

# Initialize embeddings (using a small, fast model)
# running on CPU is fine for this scale
embedding_function = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def load_knowledge():
    # Helper to load and vectorize knowledge
    
    # Check if DB exists to avoid re-ingesting every restart 
    # (Simple check: if dir exists and has files)
    if os.path.exists(CHROMA_DB_DIR) and os.listdir(CHROMA_DB_DIR):
        print("Loading existing knowledge base...", file=sys.stderr)
        return Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embedding_function)

    print("Creating new knowledge base...", file=sys.stderr)
    if not os.path.exists(KNOWLEDGE_FILE):
        raise FileNotFoundError(f"Knowledge file not found at {KNOWLEDGE_FILE}")
        
    loader = TextLoader(KNOWLEDGE_FILE)
    documents = loader.load()
    
    # Split text into chunks ensures we get relevant paragraphs
    text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    docs = text_splitter.split_documents(documents)

    # Create Chroma DB
    db = Chroma.from_documents(docs, embedding_function, persist_directory=CHROMA_DB_DIR)
    # logging.info to stderr
    print(f"Knowledge base created with {len(docs)} chunks.", file=sys.stderr)
    return db

# Initialize the vector store globally
try:
    vector_store = load_knowledge()
except Exception as e:
    print(f"Failed to load knowledge base: {e}", file=sys.stderr)
    vector_store = None

def search_manual(query: str):
    """
    Search the hotel manual for the given query.
    Returns the top 2 matching paragraphs.
    """
    if not vector_store:
        return ["Knowledge base not available."]
        
    try:
        results = vector_store.similarity_search(query, k=2)
        return [doc.page_content for doc in results]
    except Exception as e:
        return [f"Error searching knowledge base: {e}"]

if __name__ == "__main__":
    # Simple test
    print("Testing search_manual...")
    results = search_manual("pool hours")
    for r in results:
        print(f"- {r}")
