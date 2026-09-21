FROM node:20-bullseye

# Install g++ and build essentials for compiling C++ DPI Engine
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy C++ source files
COPY include/ ./include/
COPY src/ ./src/

# Compile the C++ DPI Engine
RUN g++ -std=c++17 -pthread -O2 -I include -o dpi_engine \
    src/dpi_mt.cpp \
    src/pcap_reader.cpp \
    src/packet_parser.cpp \
    src/sni_extractor.cpp \
    src/types.cpp

# Copy Next.js app
COPY dpi-dashboard/ ./dpi-dashboard/

# Build Next.js app
WORKDIR /app/dpi-dashboard
RUN npm install
RUN npm run build

# Expose port
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
