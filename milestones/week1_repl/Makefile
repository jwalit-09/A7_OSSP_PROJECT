CC = gcc
CFLAGS = -Wall -Wextra -g -Iinclude
SRC = src/main.c
TARGET = bin/shellforge

all: $(TARGET)

$(TARGET): $(SRC)
	mkdir -p bin
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf bin/*

.PHONY: all run clean
