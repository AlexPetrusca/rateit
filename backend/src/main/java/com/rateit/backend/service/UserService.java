package com.rateit.backend.service;

import com.rateit.backend.entity.User;
import com.rateit.backend.exception.ResourceNotFoundException;
import com.rateit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> getAll() {
        return userRepository.findAll();
    }

    public User create(User user) {
        return userRepository.save(user);
    }

    public User create(String phoneNumber, String username, String profilePicUrl) {
        User user = User.builder()
            .phoneNumber(phoneNumber)
            .username(username)
            .profilePicUrl(profilePicUrl)
            .build();
        return userRepository.save(user);
    }

    public User findById(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> ResourceNotFoundException.user(userId));
    }

    public User findByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(phoneNumber)
            .orElseThrow(() -> ResourceNotFoundException.user(phoneNumber));
    }
}
